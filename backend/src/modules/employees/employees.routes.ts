import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import { BadRequest, NotFound } from '../../lib/errors';

const router = Router();

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

router.patch('/:id', requireAuth, requireRole('ADMIN'), validate(updateEmployeeSchema), async (req, res, next) => {
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
});

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  const emp = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!emp) return next(NotFound('עובד לא נמצא'));
  const updated = await prisma.employee.update({ where: { id: req.params.id }, data: { active: false } });
  await auditFromReq(req, 'employee.delete', 'Employee', updated.id, emp, updated);
  res.json({ ok: true });
});

export default router;
