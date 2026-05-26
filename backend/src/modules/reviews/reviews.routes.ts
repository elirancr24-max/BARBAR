import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import { NotFound, BadRequest, Conflict } from '../../lib/errors';
import { publicLimiter } from '../../middleware/rateLimit';

const router = Router();

const createSchema = z.object({
  appointmentCode: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

// POST /reviews (PUBLIC)
router.post('/', publicLimiter, validate(createSchema), async (req, res, next) => {
  const { appointmentCode, rating, comment } = req.body as z.infer<typeof createSchema>;
  const a = await prisma.appointment.findUnique({
    where: { confirmationCode: appointmentCode },
    include: { customer: { select: { fullName: true } }, review: true },
  });
  if (!a) return next(NotFound('הזמנה לא נמצאה'));
  if (a.status !== 'COMPLETED') return next(BadRequest('ניתן לדרג רק תורים שהושלמו'));
  if (a.review) return next(Conflict('כבר נכתבה ביקורת לתור זה'));

  const review = await prisma.review.create({
    data: {
      appointmentId: a.id,
      rating,
      comment,
      customerName: a.customer.fullName,
      approved: true,
    },
  });
  res.status(201).json(review);
});

// GET /reviews/public (PUBLIC) — top 12 approved >= 4 stars
router.get('/public', async (_req, res) => {
  const reviews = await prisma.review.findMany({
    where: { approved: true, rating: { gte: 4 } },
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: {
      id: true,
      rating: true,
      comment: true,
      customerName: true,
      createdAt: true,
    },
  });
  res.json(reviews);
});

// GET /reviews (admin/barber) — all for moderation
router.get('/', requireAuth, requireRole('ADMIN', 'BARBER'), async (_req, res) => {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      appointment: {
        include: {
          service: { select: { name: true } },
          employee: { include: { user: { select: { fullName: true } } } },
          customer: { select: { fullName: true, phone: true } },
        },
      },
    },
  });
  res.json(reviews);
});

// PATCH /reviews/:id/approve (admin) — toggle approved
router.patch('/:id/approve', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  const existing = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(NotFound('ביקורת לא נמצאה'));
  const updated = await prisma.review.update({
    where: { id: existing.id },
    data: { approved: !existing.approved },
  });
  await auditFromReq(req, 'review.approve', 'Review', updated.id, existing, updated);
  res.json(updated);
});

// DELETE /reviews/:id (admin)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  const existing = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(NotFound('ביקורת לא נמצאה'));
  await prisma.review.delete({ where: { id: existing.id } });
  await auditFromReq(req, 'review.delete', 'Review', existing.id, existing, null);
  res.json({ ok: true });
});

export default router;
