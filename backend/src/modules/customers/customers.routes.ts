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

// GET /customers/:id/timeline — mixed item types (appointment/payment/review/photo/no_show), newest first, 200 most recent
router.get('/:id/timeline', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) return next(NotFound('לקוח לא נמצא'));

  const appointments = await prisma.appointment.findMany({
    where: { customerId: customer.userId },
    include: { service: true, payment: true, review: true, photos: true },
    orderBy: { startAt: 'desc' },
    take: 200,
  });

  type TimelineItem = {
    date: string;
    type: 'appointment' | 'payment' | 'review' | 'photo' | 'no_show';
    appointmentId: string;
    serviceName?: string;
    status?: string;
    amountAgorot?: number;
    tipAgorot?: number;
    rating?: number;
    comment?: string | null;
    photoUrl?: string;
    photoKind?: string;
  };

  const items: TimelineItem[] = [];
  for (const a of appointments) {
    if (a.status === 'NO_SHOW') {
      items.push({
        date: a.startAt.toISOString(),
        type: 'no_show',
        appointmentId: a.id,
        serviceName: a.service.name,
        status: a.status,
      });
    } else {
      items.push({
        date: a.startAt.toISOString(),
        type: 'appointment',
        appointmentId: a.id,
        serviceName: a.service.name,
        status: a.status,
      });
    }
    if (a.payment && a.payment.status === 'PAID' && a.payment.paidAt) {
      items.push({
        date: a.payment.paidAt.toISOString(),
        type: 'payment',
        appointmentId: a.id,
        amountAgorot: a.payment.amountAgorot,
        tipAgorot: a.payment.tipAgorot,
      });
    }
    if (a.review) {
      items.push({
        date: a.review.createdAt.toISOString(),
        type: 'review',
        appointmentId: a.id,
        rating: a.review.rating,
        comment: a.review.comment,
      });
    }
    for (const ph of a.photos) {
      items.push({
        date: ph.createdAt.toISOString(),
        type: 'photo',
        appointmentId: a.id,
        photoUrl: ph.url,
        photoKind: ph.kind,
      });
    }
  }

  items.sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
  res.json(items.slice(0, 200));
});

router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'BARBER'),
  validate(z.object({
    notes: z.string().optional(),
    vip: z.boolean().optional(),
    blocked: z.boolean().optional(),
    blockedReason: z.string().optional().nullable(),
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

// PATCH /customers/:id/marketing-consent — admin toggles marketing consent (Amendment 13)
router.patch(
  '/:id/marketing-consent',
  requireAuth,
  requireRole('ADMIN'),
  validate(z.object({ consent: z.boolean() })),
  async (req, res, next) => {
    const before = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!before) return next(NotFound('לקוח לא נמצא'));
    const consent = (req.body as { consent: boolean }).consent;
    const updated = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        marketingConsent: consent,
        marketingConsentAt: new Date(),
      },
    });
    await auditFromReq(
      req,
      consent ? 'privacy.marketing.granted' : 'privacy.marketing.revoked',
      'Customer',
      updated.id,
      { marketingConsent: before.marketingConsent, marketingConsentAt: before.marketingConsentAt },
      { marketingConsent: updated.marketingConsent, marketingConsentAt: updated.marketingConsentAt },
    );
    res.json(updated);
  },
);

// POST /customers/:id/reset-no-show — admin resets a customer's no-show counter to 0
router.post('/:id/reset-no-show', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  const before = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!before) return next(NotFound('לקוח לא נמצא'));
  const updated = await prisma.customer.update({
    where: { id: req.params.id },
    data: { noShowCount: 0, lastNoShowAt: null },
  });
  await auditFromReq(
    req,
    'customer.reset_no_show',
    'Customer',
    updated.id,
    { noShowCount: before.noShowCount, lastNoShowAt: before.lastNoShowAt },
    { noShowCount: 0, lastNoShowAt: null },
  );
  res.json({ ok: true, noShowCount: 0 });
});

export default router;
