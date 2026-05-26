import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth';
import { auditFromReq } from '../../middleware/audit';
import { prisma } from '../../lib/prisma';
import {
  listCampaignCandidates,
  previewBulkWhatsApp,
  logBulkSent,
} from './marketing.service';
import type { TemplateKey } from '../notifications/whatsapp';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

const TEMPLATE_KINDS: TemplateKey[] = [
  'confirm',
  'reminder',
  'cancel',
  'change',
  'newBookingToBarber',
  'reviewRequest',
  'slotAvailable',
  'birthdayGreeting',
  'campaignReengage',
];

const STATIC_SEGMENTS = ['dormant60d', 'dormant90d', 'vip', 'birthday_month'] as const;

router.get('/segments', async (_req, res) => {
  const out: { id: string; label: string; count: number }[] = [];
  const labels: Record<string, string> = {
    dormant60d: 'לא חזרו 60+ ימים',
    dormant90d: 'לא חזרו 90+ ימים',
    vip: 'לקוחות VIP',
    birthday_month: 'יום הולדת החודש',
  };
  for (const id of STATIC_SEGMENTS) {
    const list = await listCampaignCandidates(id);
    out.push({ id, label: labels[id] ?? id, count: list.length });
  }
  res.json({ segments: out });
});

router.get('/birthday-today', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: 'CUSTOMER', active: true, birthday: { not: null }, customer: { blocked: false } },
    select: { id: true, fullName: true, phone: true, birthday: true },
  });
  const now = new Date();
  const m = now.getMonth();
  const d = now.getDate();
  const today = users.filter((u) => u.birthday && u.birthday.getMonth() === m && u.birthday.getDate() === d);
  res.json({ count: today.length, customers: today.map((u) => ({ id: u.id, fullName: u.fullName, phone: u.phone })) });
});

const previewSchema = z.object({
  segment: z.string().min(1),
  templateKind: z.enum(TEMPLATE_KINDS as [TemplateKey, ...TemplateKey[]]),
});

router.post('/preview', async (req, res) => {
  const parsed = previewSchema.parse(req.body);
  const items = await previewBulkWhatsApp(parsed.segment, parsed.templateKind);
  res.json({ items, count: items.length });
});

const logSchema = z.object({
  customerIds: z.array(z.string().min(1)).min(1).max(500),
  templateKind: z.enum(TEMPLATE_KINDS as [TemplateKey, ...TemplateKey[]]),
});

router.post('/log-sent', async (req, res) => {
  const parsed = logSchema.parse(req.body);
  const result = await logBulkSent(parsed.customerIds, parsed.templateKind);
  await auditFromReq(req, 'campaign.log_sent', 'Customer', undefined, undefined, {
    templateKind: parsed.templateKind,
    count: result.logged,
    customerIds: parsed.customerIds,
  });
  res.json(result);
});

export default router;
