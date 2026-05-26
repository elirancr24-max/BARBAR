import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { toCsv } from '../../lib/csv';

const router = Router();

// Loads end-of-day data with per-barber commission + payout.
// Tolerates BusinessSettings model not yet existing in this branch.
async function loadEndOfDay(day: Date) {
  const start = new Date(day); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);

  let defaultCommissionPct = 0;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (prisma as any).businessSettings?.findFirst?.();
    if (settings && typeof settings.defaultCommissionPct === 'number') {
      defaultCommissionPct = settings.defaultCommissionPct;
    }
  } catch { /* model not present yet — fall back to 0 */ }

  const [appts, payments] = await Promise.all([
    prisma.appointment.findMany({
      where: { startAt: { gte: start, lt: end } },
      include: {
        service: true,
        employee: { include: { user: { select: { fullName: true } } } },
        customer: { select: { fullName: true, phone: true } },
        payment: true,
      },
      orderBy: { startAt: 'asc' },
    }),
    prisma.payment.findMany({
      where: { paidAt: { gte: start, lt: end }, status: 'PAID' },
      include: { appointment: { include: { employee: { include: { user: { select: { fullName: true } } } } } } },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  let totalRevenue = 0;
  let totalTips = 0;
  const byMethod: Record<string, number> = {};
  const byBarberMap: Record<string, { employeeId: string; name: string; revenue: number; tips: number; count: number }> = {};

  for (const a of appts) byStatus[a.status] = (byStatus[a.status] || 0) + 1;

  for (const p of payments) {
    totalRevenue += p.amountAgorot;
    totalTips += p.tipAgorot;
    const m = p.method || 'unknown';
    byMethod[m] = (byMethod[m] || 0) + p.amountAgorot;

    const empId = p.appointment.employeeId;
    const name = p.appointment.employee.user.fullName;
    if (!byBarberMap[empId]) byBarberMap[empId] = { employeeId: empId, name, revenue: 0, tips: 0, count: 0 };
    byBarberMap[empId].revenue += p.amountAgorot;
    byBarberMap[empId].tips += p.tipAgorot;
    byBarberMap[empId].count += 1;
  }

  // Fetch per-employee commission overrides
  const employeeIds = Object.keys(byBarberMap);
  const commissionByEmp: Record<string, number | null> = {};
  if (employeeIds.length > 0) {
    try {
      const emps = await prisma.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, commissionPct: true },
      });
      for (const e of emps) {
        commissionByEmp[e.id] = e.commissionPct ?? null;
      }
    } catch { /* commissionPct column not migrated yet */ }
  }

  let totalPayout = 0;
  const byBarber = Object.values(byBarberMap).map((b) => {
    const commissionPct = commissionByEmp[b.employeeId] ?? defaultCommissionPct ?? 0;
    const commissionAgorot = Math.round((b.revenue * commissionPct) / 100);
    const payoutAgorot = commissionAgorot + b.tips;
    totalPayout += payoutAgorot;
    return { ...b, commissionPct, commissionAgorot, payoutAgorot };
  });

  return {
    date: start.toISOString().slice(0, 10),
    start, end, appts,
    totalAppointments: appts.length,
    byStatus,
    totalRevenueAgorot: totalRevenue,
    totalTipsAgorot: totalTips,
    totalPayoutAgorot: totalPayout,
    defaultCommissionPct,
    byMethod,
    byBarber,
  };
}

router.use(requireAuth, requireRole('ADMIN'));

router.get('/dashboard', async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay); endOfDay.setDate(endOfDay.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOf30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOf90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  // Week range = trailing 7 days from now; previous week = the 7 days before that
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfPrevWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [todayCount, monthRevenueAgg, cancelledCount, totalCustomers, repeating, nextAppt, weekAgg, prevWeekAgg, topCustomersGroup] = await Promise.all([
    prisma.appointment.count({
      where: { startAt: { gte: startOfDay, lt: endOfDay }, status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } },
    }),
    prisma.payment.aggregate({
      _sum: { amountAgorot: true },
      where: { status: 'PAID', paidAt: { gte: startOfMonth } },
    }),
    prisma.appointment.count({
      where: { status: 'CANCELLED', updatedAt: { gte: startOf30 } },
    }),
    prisma.customer.count(),
    prisma.appointment.groupBy({
      by: ['customerId'],
      _count: { id: true },
      where: { startAt: { gte: startOf30 }, status: 'COMPLETED' },
      having: { id: { _count: { gt: 1 } } },
    }),
    prisma.appointment.findFirst({
      where: { startAt: { gte: now }, status: { in: ['PENDING', 'CONFIRMED'] } },
      orderBy: { startAt: 'asc' },
      include: { service: true, customer: { select: { id: true, fullName: true, phone: true } } },
    }),
    prisma.payment.aggregate({
      _sum: { amountAgorot: true },
      where: { status: 'PAID', paidAt: { gte: startOfWeek } },
    }),
    prisma.payment.aggregate({
      _sum: { amountAgorot: true },
      where: { status: 'PAID', paidAt: { gte: startOfPrevWeek, lt: startOfWeek } },
    }),
    prisma.payment.groupBy({
      by: ['appointmentId'],
      _sum: { amountAgorot: true },
      where: { status: 'PAID', paidAt: { gte: startOf90 } },
    }),
  ]);

  // Aggregate top customers — map appointmentId → customer, then sum per customer
  let topCustomers: { userId: string; customerId: string | null; fullName: string; totalAgorot: number; visits: number }[] = [];
  if (topCustomersGroup.length > 0) {
    const appts = await prisma.appointment.findMany({
      where: { id: { in: topCustomersGroup.map((g) => g.appointmentId) } },
      select: {
        id: true,
        customerId: true,
        customer: { select: { id: true, fullName: true, customer: { select: { id: true } } } },
      },
    });
    const apptById: Record<string, { userId: string; customerId: string | null; fullName: string }> = {};
    for (const a of appts) apptById[a.id] = { userId: a.customerId, customerId: a.customer.customer?.id ?? null, fullName: a.customer.fullName };
    const byCustomer: Record<string, { userId: string; customerId: string | null; fullName: string; totalAgorot: number; visits: number }> = {};
    for (const g of topCustomersGroup) {
      const info = apptById[g.appointmentId];
      if (!info) continue;
      if (!byCustomer[info.userId]) {
        byCustomer[info.userId] = { userId: info.userId, customerId: info.customerId, fullName: info.fullName, totalAgorot: 0, visits: 0 };
      }
      byCustomer[info.userId].totalAgorot += g._sum.amountAgorot || 0;
      byCustomer[info.userId].visits += 1;
    }
    topCustomers = Object.values(byCustomer).sort((a, b) => b.totalAgorot - a.totalAgorot).slice(0, 5);
  }

  const weekRevenue = weekAgg._sum.amountAgorot || 0;
  const lastWeekRevenue = prevWeekAgg._sum.amountAgorot || 0;
  const weekRevenueDelta = lastWeekRevenue === 0
    ? (weekRevenue > 0 ? 100 : 0)
    : Math.round(((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100);

  let nextAppointment: null | {
    id: string; time: string; customerName: string; customerPhone: string; serviceName: string; minutesUntil: number;
  } = null;
  if (nextAppt) {
    nextAppointment = {
      id: nextAppt.id,
      time: nextAppt.startAt.toISOString(),
      customerName: nextAppt.customer.fullName,
      customerPhone: nextAppt.customer.phone,
      serviceName: nextAppt.service.name,
      minutesUntil: Math.max(0, Math.round((nextAppt.startAt.getTime() - now.getTime()) / 60000)),
    };
  }

  res.json({
    todayAppointments: todayCount,
    monthRevenueAgorot: monthRevenueAgg._sum.amountAgorot || 0,
    cancelledLast30: cancelledCount,
    totalCustomers,
    repeatingCustomers: repeating.length,
    nextAppointment,
    weekRevenue,
    lastWeekRevenue,
    weekRevenueDelta,
    topCustomers,
  });
});

router.get('/revenue', async (req, res) => {
  const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(req.query.to as string) : new Date();

  const payments = await prisma.payment.findMany({
    where: { status: 'PAID', paidAt: { gte: from, lte: to } },
    select: { amountAgorot: true, paidAt: true },
    orderBy: { paidAt: 'asc' },
  });

  // group by day
  const map = new Map<string, number>();
  for (const p of payments) {
    if (!p.paidAt) continue;
    const day = p.paidAt.toISOString().slice(0, 10);
    map.set(day, (map.get(day) || 0) + p.amountAgorot);
  }
  const series = Array.from(map.entries()).map(([date, amount]) => ({ date, amountAgorot: amount }));
  res.json({ series });
});

router.get('/busy-hours', async (_req, res) => {
  const startOf30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const apps = await prisma.appointment.findMany({
    where: { startAt: { gte: startOf30 }, status: { in: ['CONFIRMED', 'COMPLETED'] } },
    select: { startAt: true },
  });
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  for (const a of apps) buckets[a.startAt.getHours()].count++;
  res.json({ buckets });
});

router.get('/end-of-day', async (req, res) => {
  const day = req.query.date ? new Date(req.query.date as string) : new Date();
  const data = await loadEndOfDay(day);
  res.json({
    date: data.date,
    totalAppointments: data.totalAppointments,
    byStatus: data.byStatus,
    totalRevenueAgorot: data.totalRevenueAgorot,
    totalTipsAgorot: data.totalTipsAgorot,
    totalPayoutAgorot: data.totalPayoutAgorot,
    defaultCommissionPct: data.defaultCommissionPct,
    byMethod: data.byMethod,
    byBarber: data.byBarber,
    appointments: data.appts.map((a) => ({
      id: a.id,
      time: a.startAt,
      customer: a.customer.fullName,
      phone: a.customer.phone,
      service: a.service.name,
      barber: a.employee.user.fullName,
      status: a.status,
      paid: a.payment?.status === 'PAID',
      amount: a.payment?.amountAgorot ?? a.priceAgorot,
      tip: a.payment?.tipAgorot ?? 0,
      method: a.payment?.method ?? null,
    })),
  });
});

router.get('/end-of-day.csv', async (req, res) => {
  const day = req.query.date ? new Date(req.query.date as string) : new Date();
  const data = await loadEndOfDay(day);

  const rows: (string | number)[][] = [
    ['ספר', 'תורים', 'הכנסות (₪)', 'טיפים (₪)', 'אחוז עמלה', 'עמלה (₪)', 'סך לתשלום (₪)'],
  ];
  for (const b of data.byBarber) {
    rows.push([
      b.name,
      b.count,
      (b.revenue / 100).toFixed(2),
      (b.tips / 100).toFixed(2),
      `${b.commissionPct}%`,
      (b.commissionAgorot / 100).toFixed(2),
      (b.payoutAgorot / 100).toFixed(2),
    ]);
  }
  // Totals row
  const totalRev = data.byBarber.reduce((s, b) => s + b.revenue, 0);
  const totalTip = data.byBarber.reduce((s, b) => s + b.tips, 0);
  const totalCount = data.byBarber.reduce((s, b) => s + b.count, 0);
  const totalCommission = data.byBarber.reduce((s, b) => s + b.commissionAgorot, 0);
  rows.push([
    'סה״כ',
    totalCount,
    (totalRev / 100).toFixed(2),
    (totalTip / 100).toFixed(2),
    '',
    (totalCommission / 100).toFixed(2),
    (data.totalPayoutAgorot / 100).toFixed(2),
  ]);

  const csv = toCsv(rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="end-of-day-${data.date}.csv"`);
  res.send(csv);
});

router.get('/birthdays', async (_req, res) => {
  // Find customer users with birthday in next 30 days
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER', birthday: { not: null } },
    select: { id: true, fullName: true, phone: true, birthday: true, customer: { select: { id: true } } },
  });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = customers
    .map((u) => {
      const b = u.birthday!;
      const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      const daysUntil = Math.round((next.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      return { ...u, daysUntil, next };
    })
    .filter((u) => u.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  res.json(upcoming);
});

router.get('/top-barber', async (_req, res) => {
  const startOf30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const grouped = await prisma.appointment.groupBy({
    by: ['employeeId'],
    _count: { id: true },
    where: { startAt: { gte: startOf30 }, status: 'COMPLETED' },
    orderBy: { _count: { id: 'desc' } },
  });
  const employees = await prisma.employee.findMany({
    where: { id: { in: grouped.map((g) => g.employeeId) } },
    include: { user: { select: { fullName: true } } },
  });
  const result = grouped.map((g) => ({
    employeeId: g.employeeId,
    name: employees.find((e) => e.id === g.employeeId)?.user.fullName ?? '?',
    count: g._count.id,
  }));
  res.json({ ranking: result });
});

export default router;
