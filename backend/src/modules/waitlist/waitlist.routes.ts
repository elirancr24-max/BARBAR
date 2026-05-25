import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import { NotFound } from '../../lib/errors';
import { getIO } from '../../lib/socket';

const router = Router();

const createSchema = z.object({
  customerName: z.string().min(1).max(120),
  customerPhone: z.string().min(5).max(40),
  serviceId: z.string().optional(),
  employeeId: z.string().optional(),
  preferredDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

// POST /waitlist (PUBLIC)
router.post('/', validate(createSchema), async (req, res) => {
  const dto = req.body as z.infer<typeof createSchema>;
  const entry = await prisma.waitlistEntry.create({
    data: {
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      serviceId: dto.serviceId,
      employeeId: dto.employeeId,
      preferredDate: dto.preferredDate,
      notes: dto.notes,
      status: 'WAITING',
    },
  });

  try {
    getIO().to('tenant:default').emit('waitlist.new', { id: entry.id, entry });
  } catch {
    // socket may not be initialized in tests
  }

  res.status(201).json(entry);
});

// GET /waitlist (admin/barber) — pending entries
router.get('/', requireAuth, requireRole('ADMIN', 'BARBER'), async (_req, res) => {
  const list = await prisma.waitlistEntry.findMany({
    where: { status: 'WAITING' },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  // Manually join service + employee (optional fields, no relation in schema)
  const serviceIds = Array.from(new Set(list.map((e) => e.serviceId).filter(Boolean))) as string[];
  const employeeIds = Array.from(new Set(list.map((e) => e.employeeId).filter(Boolean))) as string[];
  const [services, employees] = await Promise.all([
    serviceIds.length
      ? prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    employeeIds.length
      ? prisma.employee.findMany({
          where: { id: { in: employeeIds } },
          select: { id: true, user: { select: { fullName: true } } },
        })
      : Promise.resolve([]),
  ]);
  const serviceById = new Map(services.map((s) => [s.id, s.name]));
  const employeeById = new Map(employees.map((e) => [e.id, e.user.fullName]));

  res.json(
    list.map((e) => ({
      ...e,
      serviceName: e.serviceId ? serviceById.get(e.serviceId) ?? null : null,
      employeeName: e.employeeId ? employeeById.get(e.employeeId) ?? null : null,
    })),
  );
});

// POST /waitlist/:id/notify (admin/barber)
router.post('/:id/notify', requireAuth, requireRole('ADMIN', 'BARBER'), async (req, res, next) => {
  const existing = await prisma.waitlistEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(NotFound('ערך לא נמצא'));
  const updated = await prisma.waitlistEntry.update({
    where: { id: existing.id },
    data: { status: 'NOTIFIED', notifiedAt: new Date() },
  });

  const message = `היי ${existing.customerName}, יש לנו עכשיו תור פנוי במספרה. רוצה לקבוע?`;
  const phone = existing.customerPhone.replace(/\D/g, '');
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  await auditFromReq(req, 'waitlist.notify', 'WaitlistEntry', updated.id, existing, updated);
  res.json({ entry: updated, whatsappUrl: waUrl, message });
});

// DELETE /waitlist/:id (admin/barber)
router.delete('/:id', requireAuth, requireRole('ADMIN', 'BARBER'), async (req, res, next) => {
  const existing = await prisma.waitlistEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(NotFound('ערך לא נמצא'));
  await prisma.waitlistEntry.delete({ where: { id: existing.id } });
  await auditFromReq(req, 'waitlist.delete', 'WaitlistEntry', existing.id, existing, null);
  res.json({ ok: true });
});

export default router;
