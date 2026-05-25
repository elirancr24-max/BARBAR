import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import { NotFound } from '../../lib/errors';

const router = Router();

router.get('/', requireAuth, requireRole('ADMIN', 'BARBER'), async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const customers = await prisma.customer.findMany({
    where: q
      ? {
          user: {
            OR: [
              { fullName: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
            ],
          },
        }
      : undefined,
    include: { user: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(customers);
});

router.get('/:id', requireAuth, requireRole('ADMIN', 'BARBER'), async (req, res, next) => {
  const c = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, fullName: true, email: true, phone: true, birthday: true, createdAt: true } } },
  });
  if (!c) return next(NotFound('לקוח לא נמצא'));
  res.json({
    ...c,
    tags: c.tags ? c.tags.split(',').filter(Boolean) : [],
  });
});

router.get('/:id/history', requireAuth, requireRole('ADMIN', 'BARBER'), async (req, res, next) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) return next(NotFound('לקוח לא נמצא'));
  const appointments = await prisma.appointment.findMany({
    where: { customerId: customer.userId },
    include: { service: true, employee: { include: { user: true } } },
    orderBy: { startAt: 'desc' },
  });
  res.json(appointments);
});

router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'BARBER'),
  validate(z.object({
    notes: z.string().optional(),
    vip: z.boolean().optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    birthday: z.string().optional().nullable(),
    fullName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  })),
  async (req, res, next) => {
    const before = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!before) return next(NotFound('לקוח לא נמצא'));

    const { fullName, phone, email, birthday, tags, ...rest } = req.body as Record<string, unknown>;
    const customerData: Record<string, unknown> = { ...rest };
    if (tags !== undefined) {
      customerData.tags = Array.isArray(tags) ? (tags as string[]).join(',') : String(tags);
    }
    const updated = await prisma.customer.update({ where: { id: req.params.id }, data: customerData });
    if (fullName || phone || email || birthday !== undefined) {
      const userData: Record<string, unknown> = {};
      if (fullName) userData.fullName = fullName;
      if (phone) userData.phone = phone;
      if (email) userData.email = email;
      if (birthday !== undefined) userData.birthday = birthday ? new Date(birthday as string) : null;
      await prisma.user.update({ where: { id: before.userId }, data: userData });
    }
    await auditFromReq(req, 'customer.update', 'Customer', updated.id, before, updated);
    res.json(updated);
  },
);

export default router;
