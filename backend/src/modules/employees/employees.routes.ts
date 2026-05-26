import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import { BadRequest, NotFound, Forbidden } from '../../lib/errors';
import {
  defaultTemplates,
  TEMPLATE_LABELS,
  type TemplateKey,
  type EmployeeTemplates,
} from '../notifications/whatsapp';

const router = Router();

const TEMPLATE_KEYS: TemplateKey[] = ['confirm', 'reminder', 'cancel', 'change', 'newBookingToBarber', 'reviewRequest', 'slotAvailable'];

const templatesSchema = z.object({
  templates: z.record(
    z.string(),
    z.object({
      enabled: z.boolean(),
      template: z.string().max(2000),
    }),
  ),
});

async function resolveEmployeeForUser(userId: string, role: string, paramId: string) {
  if (paramId === 'me') {
    // ADMIN owner who is also a barber, or a regular BARBER
    const emp = await prisma.employee.findUnique({ where: { userId } });
    if (!emp) throw NotFound('פרופיל עובד לא נמצא — המשתמש אינו ספר');
    return emp;
  }
  const emp = await prisma.employee.findUnique({ where: { id: paramId } });
  if (!emp) throw NotFound('עובד לא נמצא');
  if (role === 'BARBER' && emp.userId !== userId) throw Forbidden();
  return emp;
}

// GET WhatsApp phone configured for this barber (falls back to user.phone)
router.get('/:id/whatsapp-phone', requireAuth, requireRole('ADMIN', 'BARBER'), async (req, res, next) => {
  try {
    const emp = await resolveEmployeeForUser(req.user!.sub, req.user!.role, req.params.id);
    const user = await prisma.user.findUnique({ where: { id: emp.userId }, select: { phone: true } });
    res.json({
      whatsappPhone: emp.whatsappPhone || null,
      effective: emp.whatsappPhone || user?.phone || null,
      fallbackPhone: user?.phone || null,
    });
  } catch (e) { next(e); }
});

router.put('/:id/whatsapp-phone', requireAuth, requireRole('ADMIN', 'BARBER'),
  validate(z.object({ whatsappPhone: z.string().min(5).max(40).nullable() })),
  async (req, res, next) => {
    try {
      const emp = await resolveEmployeeForUser(req.user!.sub, req.user!.role, req.params.id);
      const { whatsappPhone } = req.body as { whatsappPhone: string | null };
      const updated = await prisma.employee.update({
        where: { id: emp.id },
        data: { whatsappPhone: whatsappPhone ? whatsappPhone.trim() : null },
      });
      await auditFromReq(req, 'employee.whatsapp-phone.update', 'Employee', emp.id, emp.whatsappPhone, updated.whatsappPhone);
      res.json({ ok: true, whatsappPhone: updated.whatsappPhone });
    } catch (e) { next(e); }
  });

// GET templates (defaults merged with employee overrides)
router.get('/:id/templates', requireAuth, requireRole('ADMIN', 'BARBER'), async (req, res, next) => {
  try {
    const emp = await resolveEmployeeForUser(req.user!.sub, req.user!.role, req.params.id);
    const stored = (emp.messageTemplates as EmployeeTemplates | null) ?? {};
    const merged = TEMPLATE_KEYS.map((key) => {
      const cfg = stored[key];
      return {
        key,
        label: TEMPLATE_LABELS[key].label,
        description: TEMPLATE_LABELS[key].description,
        toCustomer: TEMPLATE_LABELS[key].toCustomer,
        enabled: cfg?.enabled !== false,
        template: cfg?.template?.trim() || defaultTemplates[key],
        defaultTemplate: defaultTemplates[key],
        isCustomized: !!cfg?.template?.trim() && cfg.template.trim() !== defaultTemplates[key],
      };
    });
    res.json({ templates: merged });
  } catch (e) { next(e); }
});

router.put('/:id/templates', requireAuth, requireRole('ADMIN', 'BARBER'), validate(templatesSchema), async (req, res, next) => {
  try {
    const emp = await resolveEmployeeForUser(req.user!.sub, req.user!.role, req.params.id);
    const { templates } = req.body as { templates: Record<string, { enabled: boolean; template: string }> };
    // Validate keys
    const cleaned: EmployeeTemplates = {};
    for (const key of TEMPLATE_KEYS) {
      const cfg = templates[key];
      if (!cfg) continue;
      cleaned[key] = {
        enabled: !!cfg.enabled,
        template: (cfg.template || '').slice(0, 2000),
      };
    }
    const updated = await prisma.employee.update({
      where: { id: emp.id },
      data: { messageTemplates: cleaned as object },
    });
    await auditFromReq(req, 'employee.templates.update', 'Employee', emp.id, emp.messageTemplates, updated.messageTemplates);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

const createEmployeeSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(9),
  password: z.string().min(8),
  fullName: z.string().min(2),
  bio: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const updateEmployeeSchema = z.object({
  fullName: z.string().min(2).optional(),
  bio: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  active: z.boolean().optional(),
  commissionPct: z.number().int().min(0).max(100).nullable().optional(),
});

router.get('/', async (_req, res) => {
  const employees = await prisma.employee.findMany({
    where: { active: true, user: { active: true } },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      services: { include: { service: true } },
    },
  });
  res.json(employees);
});

router.get('/:id', async (req, res, next) => {
  const emp = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      workingHours: true,
      services: { include: { service: true } },
    },
  });
  if (!emp) return next(NotFound('עובד לא נמצא'));
  res.json(emp);
});

router.post('/', requireAuth, requireRole('ADMIN'), validate(createEmployeeSchema), async (req, res, next) => {
  const dto = req.body as z.infer<typeof createEmployeeSchema>;
  const exists = await prisma.user.findFirst({ where: { OR: [{ email: dto.email }, { phone: dto.phone }] } });
  if (exists) return next(BadRequest('משתמש עם אימייל או טלפון זה כבר קיים'));

  const passwordHash = await bcrypt.hash(dto.password, 12);
  const user = await prisma.user.create({
    data: {
      email: dto.email,
      phone: dto.phone,
      fullName: dto.fullName,
      passwordHash,
      role: 'BARBER',
      employee: {
        create: { bio: dto.bio, color: dto.color ?? '#c9a961' },
      },
    },
    include: { employee: true },
  });

  await auditFromReq(req, 'employee.create', 'Employee', user.employee!.id, null, { id: user.employee!.id });
  res.status(201).json(user);
});

async function updateEmployeeHandler(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const emp = await prisma.employee.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!emp) return next(NotFound('עובד לא נמצא'));

  const { fullName, ...empData } = req.body as z.infer<typeof updateEmployeeSchema>;
  const before = { ...emp };
  const updated = await prisma.employee.update({
    where: { id: req.params.id },
    data: empData,
    include: { user: true },
  });
  if (fullName) {
    await prisma.user.update({ where: { id: emp.userId }, data: { fullName } });
  }
  await auditFromReq(req, 'employee.update', 'Employee', updated.id, before, updated);
  res.json(updated);
}

router.patch('/:id', requireAuth, requireRole('ADMIN'), validate(updateEmployeeSchema), updateEmployeeHandler);
router.put('/:id', requireAuth, requireRole('ADMIN'), validate(updateEmployeeSchema), updateEmployeeHandler);

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  const emp = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!emp) return next(NotFound('עובד לא נמצא'));
  const updated = await prisma.employee.update({ where: { id: req.params.id }, data: { active: false } });
  await auditFromReq(req, 'employee.delete', 'Employee', updated.id, emp, updated);
  res.json({ ok: true });
});

// PUT /employees/:id/password — admin resets employee password
router.put('/:id/password', requireAuth, requireRole('ADMIN'),
  validate(z.object({ password: z.string().min(8).max(200) })),
  async (req, res, next) => {
    try {
      const employeeId = req.params.id;
      const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
      if (!emp) return next(NotFound('עובד לא נמצא'));
      const { password } = req.body as { password: string };
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.update({ where: { id: emp.userId }, data: { passwordHash } });
      await auditFromReq(req, 'employee.password.changed', 'Employee', employeeId);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

export default router;
