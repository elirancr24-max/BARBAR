import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { NotFound, BadRequest } from '../../lib/errors';
import { emitAppointmentEvent } from '../../lib/socket';
import { invalidateAvailability } from '../availability/availability.service';

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
router.get('/:code', async (req, res, next) => {
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
  });
});

// DELETE /bookings/:code — public cancel by code
router.delete('/:code', async (req, res, next) => {
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

export default router;
