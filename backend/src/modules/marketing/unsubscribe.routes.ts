import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { verifyUnsubscribeToken } from '../../lib/marketingUnsubscribe';
import { writeAudit } from '../../middleware/audit';
import { publicLimiter } from '../../middleware/rateLimit';

const router = Router();

// GET /unsubscribe?t=<token> — return JSON for frontend to render confirmation page
router.get('/', publicLimiter, async (req, res) => {
  const token = String(req.query.t || '');
  const v = verifyUnsubscribeToken(token);
  if (!v) return res.status(400).json({ ok: false, error: 'invalid_token' });
  const customer = await prisma.customer.findUnique({
    where: { id: v.customerId },
    include: { user: { select: { fullName: true } } },
  });
  if (!customer) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({
    ok: true,
    customerName: customer.user.fullName,
    alreadyOptedOut: !customer.marketingConsent,
  });
});

// POST /unsubscribe — perform the unsubscribe
router.post('/', publicLimiter, async (req, res) => {
  const token = String(req.body?.t || req.query.t || '');
  const v = verifyUnsubscribeToken(token);
  if (!v) return res.status(400).json({ ok: false, error: 'invalid_token' });
  const before = await prisma.customer.findUnique({
    where: { id: v.customerId },
    select: { marketingConsent: true },
  });
  if (!before) return res.status(404).json({ ok: false, error: 'not_found' });
  await prisma.customer.update({
    where: { id: v.customerId },
    data: { marketingConsent: false, marketingConsentAt: new Date() },
  });
  await writeAudit({
    actorId: null,
    actorRole: 'CUSTOMER_SELF',
    action: 'marketing.unsubscribe',
    entityType: 'Customer',
    entityId: v.customerId,
    before,
    after: { marketingConsent: false },
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  res.json({ ok: true });
});

export default router;
