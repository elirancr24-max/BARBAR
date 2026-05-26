import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { NotFound, BadRequest } from '../../lib/errors';
import { emitAppointmentEvent } from '../../lib/socket';
import { invalidateAvailability } from '../availability/availability.service';
import { publicLimiter } from '../../middleware/rateLimit';
import { consumeToken } from '../appointments/cancel-tokens.service';
import { getBusinessSettings } from '../../lib/businessSettings';
import { writeAudit } from '../../middleware/audit';

const router = Router();

// POST /bookings/lookup — batch lookup for "my bookings" page using locally-stored codes
router.post('/lookup', async (req, res) => {
  const codes = Array.isArray(req.body?.codes) ? (req.body.codes as string[]).slice(0, 50) : [];
  if (codes.length === 0) return res.json({ bookings: [] });
  const list = await prisma.appointment.findMany({
    where: { confirmationCode: { in: codes } },
    include: {
      service: { select: { name: true, color: true } },
      employee: { include: { user: { select: { fullName: true, phone: true } } } },
      customer: { select: { fullName: true, phone: true } },
    },
    orderBy: { startAt: 'desc' },
  });
  res.json({
    bookings: list.map((a) => ({
      id: a.id,
      confirmationCode: a.confirmationCode,
      customerName: a.customer.fullName,
      serviceName: a.service.name,
      serviceColor: a.service.color,
      employeeName: a.employee.user.fullName,
      employeePhone: a.employee.user.phone,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      priceAgorot: a.priceAgorot,
    })),
  });
});

// GET /bookings/:code — public lookup by confirmation code
router.get('/:code', publicLimiter, async (req, res, next) => {
  const code = req.params.code;
  const a = await prisma.appointment.findUnique({
    where: { confirmationCode: code },
    include: {
      service: { select: { name: true } },
      employee: { include: { user: { select: { fullName: true } } } },
      customer: { select: { fullName: true, phone: true } },
    },
  });
  if (!a) return next(NotFound('הזמנה לא נמצאה'));
  if (a.status === 'CANCELLED') return next(NotFound('ההזמנה בוטלה'));

  // Build deposit payload (Bit link) if a deposit is required.
  let depositBitLink: string | null = null;
  let depositAgorot: number | undefined;
  if (a.depositRequired) {
    const settings = await getBusinessSettings();
    if (settings) {
      depositAgorot = settings.depositAgorot;
      if (
        (settings.depositMethod === 'BIT_LINK' || settings.depositMethod === 'BOTH') &&
        settings.bitPhone
      ) {
        const normalizedBitPhone = settings.bitPhone.replace(/[^\d]/g, '');
        const amountIls = (settings.depositAgorot ?? 0) / 100;
        depositBitLink = `https://www.bitpay.co.il/app/me/${normalizedBitPhone}?amount=${amountIls}`;
      }
    }
  }

  res.json({
    customerName: a.customer.fullName,
    customerPhone: a.customer.phone,
    serviceName: a.service.name,
    employeeName: a.employee.user.fullName,
    startAt: a.startAt,
    endAt: a.endAt,
    status: a.status,
    priceAgorot: a.priceAgorot,
    confirmationCode: a.confirmationCode,
    depositRequired: a.depositRequired,
    depositPaidAt: a.depositPaidAt,
    depositAgorot,
    depositBitLink,
  });
});

// DELETE /bookings/:code — public cancel by code
router.delete('/:code', publicLimiter, async (req, res, next) => {
  const code = req.params.code;
  const a = await prisma.appointment.findUnique({
    where: { confirmationCode: code },
    include: { employee: { include: { user: true } } },
  });
  if (!a) return next(NotFound('הזמנה לא נמצאה'));
  if (a.status !== 'PENDING' && a.status !== 'CONFIRMED') {
    return next(BadRequest('לא ניתן לבטל הזמנה זו'));
  }

  const cancelled = await prisma.appointment.update({
    where: { id: a.id },
    data: { status: 'CANCELLED' },
  });

  await invalidateAvailability(a.employeeId, a.startAt);

  emitAppointmentEvent('appointment.deleted', {
    id: cancelled.id,
    employeeUserId: a.employee.userId,
    customerId: a.customerId,
  });

  res.json({ ok: true, id: cancelled.id, status: cancelled.status });
});

// POST /bookings/:code/cancel-with-token — public, single-use secure token cancel
router.post('/:code/cancel-with-token', publicLimiter, async (req, res, next) => {
  const code = req.params.code;
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  if (!token) return next(BadRequest('חסר טוקן ביטול'));

  const a = await prisma.appointment.findUnique({
    where: { confirmationCode: code },
    include: { employee: { include: { user: true } } },
  });
  if (!a) return next(NotFound('הזמנה לא נמצאה'));
  if (a.status !== 'PENDING' && a.status !== 'CONFIRMED') {
    return next(BadRequest('לא ניתן לבטל הזמנה זו'));
  }

  const settings = await getBusinessSettings();
  if (!settings?.allowSelfCancel) {
    return next(BadRequest('ביטול עצמי אינו מאופשר במספרה זו'));
  }

  const cutoffHr = settings.selfCancelCutoffHr ?? 0;
  const minStart = new Date(Date.now() + cutoffHr * 60 * 60 * 1000);
  if (a.startAt <= minStart) {
    return next(BadRequest(`לא ניתן לבטל פחות מ-${cutoffHr} שעות לפני התור — ראה מדיניות ביטולים`));
  }

  const apptId = await consumeToken(token);
  if (!apptId || apptId !== a.id) {
    return next(BadRequest('הטוקן אינו תקין, נוצל, או שפג תוקפו'));
  }

  const cancelled = await prisma.appointment.update({
    where: { id: a.id },
    data: { status: 'CANCELLED' },
  });

  await invalidateAvailability(a.employeeId, a.startAt);

  emitAppointmentEvent('appointment.deleted', {
    id: cancelled.id,
    employeeUserId: a.employee.userId,
    customerId: a.customerId,
  });

  await writeAudit({
    actorId: null,
    actorRole: 'PUBLIC',
    action: 'appointment.self_cancel',
    entityType: 'Appointment',
    entityId: a.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({ ok: true });
});

export default router;
