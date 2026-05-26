import { Router, type Request } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

function parseRange(req: Request) {
  const from = req.query.from
    ? new Date(String(req.query.from))
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  // include the whole "to" day
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

async function fetchPaymentsInRange(from: Date, to: Date) {
  return prisma.payment.findMany({
    where: { status: 'PAID', paidAt: { gte: from, lte: to } },
    include: {
      appointment: {
        include: {
          service: { select: { name: true } },
          customer: { select: { fullName: true, phone: true } },
          employee: { include: { user: { select: { fullName: true } } } },
        },
      },
    },
    orderBy: { paidAt: 'asc' },
  });
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

router.get('/payments.csv', async (req, res) => {
  const { from, to } = parseRange(req);
  const settings = await prisma.businessSettings.findUnique({ where: { id: 'singleton' } });
  const vatRate = settings?.vatRate ?? 17;
  const includeVat = settings?.taxStatus === 'OSEK_MURSHE';
  const payments = await fetchPaymentsInRange(from, to);

  const headers = [
    'תאריך',
    'מספר קבלה',
    'לקוח',
    'טלפון',
    'שירות',
    'ספר',
    'סכום ברוטו (₪)',
    'טיפ (₪)',
    includeVat ? 'מע״מ (₪)' : 'מע״מ',
    'סכום נטו (₪)',
    'אמצעי תשלום',
    'מזהה תשלום',
  ];
  const rows: string[] = [];
  rows.push(headers.map(csvEscape).join(','));
  for (const p of payments) {
    const gross = p.amountAgorot / 100;
    const tip = p.tipAgorot / 100;
    const vat = includeVat ? +(gross - gross / (1 + vatRate / 100)).toFixed(2) : 0;
    const net = includeVat ? +(gross - vat).toFixed(2) : gross;
    rows.push(
      [
        p.paidAt ? p.paidAt.toISOString().slice(0, 10) : '',
        p.receiptNumber ?? '',
        p.appointment.customer.fullName,
        p.appointment.customer.phone,
        p.appointment.service.name,
        p.appointment.employee.user.fullName,
        gross.toFixed(2),
        tip.toFixed(2),
        includeVat ? vat.toFixed(2) : 'פטור',
        net.toFixed(2),
        p.method ?? '',
        p.id,
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  const body = '﻿' + rows.join('\r\n'); // BOM for Excel Hebrew
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="payments-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv"`,
  );
  res.send(body);
});

router.get('/summary', async (req, res) => {
  const { from, to } = parseRange(req);
  const settings = await prisma.businessSettings.findUnique({ where: { id: 'singleton' } });
  const vatRate = settings?.vatRate ?? 17;
  const includeVat = settings?.taxStatus === 'OSEK_MURSHE';
  const payments = await fetchPaymentsInRange(from, to);
  let totalGross = 0;
  let totalTip = 0;
  let totalVat = 0;
  const byMethod: Record<string, number> = {};
  for (const p of payments) {
    totalGross += p.amountAgorot;
    totalTip += p.tipAgorot;
    const m = p.method || 'unknown';
    byMethod[m] = (byMethod[m] || 0) + p.amountAgorot;
  }
  if (includeVat) {
    const grossNis = totalGross / 100;
    totalVat = +(grossNis - grossNis / (1 + vatRate / 100)).toFixed(2);
  }
  res.json({
    from: from.toISOString(),
    to: to.toISOString(),
    taxStatus: settings?.taxStatus ?? 'UNKNOWN',
    vatRate,
    count: payments.length,
    totalGrossAgorot: totalGross,
    totalTipAgorot: totalTip,
    totalVatNis: totalVat,
    totalNetNis: includeVat ? +(totalGross / 100 - totalVat).toFixed(2) : totalGross / 100,
    byMethod,
  });
});

export default router;
