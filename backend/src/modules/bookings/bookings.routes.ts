import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { NotFound, BadRequest } from '../../lib/errors';
import { emitAppointmentEvent } from '../../lib/socket';
import { invalidateAvailability } from '../availability/availability.service';

const router = Router();

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
