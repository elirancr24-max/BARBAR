import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import { NotFound } from '../../lib/errors';

const router = Router();

// GET /privacy-requests — list customers with pending export/deletion requests
router.get('/', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const rows = await prisma.customer.findMany({
    where: {
      OR: [
        { dataExportRequestedAt: { not: null } },
        { AND: [{ dataDeletionRequestedAt: { not: null } }, { dataDeletionApprovedAt: null }] },
      ],
    },
    include: { user: { select: { fullName: true, phone: true, email: true } } },
  });

  const now = Date.now();
  const out = rows.map((c) => {
    const hasExport = !!c.dataExportRequestedAt;
    const hasDeletion = !!c.dataDeletionRequestedAt && !c.dataDeletionApprovedAt;
    let type: 'export' | 'deletion' | 'both' = 'export';
    if (hasExport && hasDeletion) type = 'both';
    else if (hasDeletion) type = 'deletion';
    const requestedAt =
      hasDeletion && c.dataDeletionRequestedAt
        ? c.dataDeletionRequestedAt
        : (c.dataExportRequestedAt as Date);
    const ageDays = Math.floor((now - new Date(requestedAt).getTime()) / (1000 * 60 * 60 * 24));
    return {
      customerId: c.id,
      userId: c.userId,
      fullName: c.user.fullName,
      phone: c.user.phone,
      email: c.user.email,
      type,
      requestedAt: requestedAt.toISOString(),
      ageDays,
    };
  });
  // Sort: deletion-pending first (SLA risk), then by oldest first
  out.sort((a, b) => {
    if (a.type !== b.type) {
      const order: Record<string, number> = { both: 0, deletion: 1, export: 2 };
      return order[a.type] - order[b.type];
    }
    return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
  });
  res.json(out);
});

// POST /privacy-requests/:customerId/approve-deletion — anonymize PII
router.post('/:customerId/approve-deletion', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.customerId } });
  if (!customer) return next(NotFound('לקוח לא נמצא'));

  const userId = customer.userId;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        fullName: 'לקוח שנמחק',
        email: `deleted-${userId}@example.invalid`,
        phone: '0000000000',
        birthday: null,
        avatarUrl: null,
        active: false,
      },
    });

    await tx.customer.update({
      where: { id: customer.id },
      data: {
        notes: null,
        tags: '',
        marketingConsent: false,
        marketingConsentRevokedAt: now,
        dataDeletionApprovedAt: now,
      },
    });

    await tx.appointment.updateMany({
      where: { customerId: userId },
      data: { notes: null },
    });

    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
  });

  await auditFromReq(req, 'personal_data.deletion_executed', 'Customer', customer.id);
  res.json({ ok: true, dataDeletionApprovedAt: now });
});

// POST /privacy-requests/:customerId/reject-deletion — clear request; reason required
router.post(
  '/:customerId/reject-deletion',
  requireAuth,
  requireRole('ADMIN'),
  validate(z.object({ reason: z.string().min(1) })),
  async (req, res, next) => {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.customerId } });
    if (!customer) return next(NotFound('לקוח לא נמצא'));
    const { reason } = req.body as { reason: string };

    await prisma.customer.update({
      where: { id: customer.id },
      data: { dataDeletionRequestedAt: null, dataDeletionApprovedAt: null },
    });

    await auditFromReq(
      req,
      'personal_data.deletion_rejected',
      'Customer',
      customer.id,
      { dataDeletionRequestedAt: customer.dataDeletionRequestedAt },
      { reason },
    );
    res.json({ ok: true });
  },
);

export default router;
