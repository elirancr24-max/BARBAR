import { prisma } from '../../lib/prisma';
import type { AppointmentStatus } from '../../types/db';
import { BadRequest, Conflict, NotFound, Forbidden } from '../../lib/errors';
import { emitAppointmentEvent } from '../../lib/socket';
import { forceReleaseAfterBooking } from './locking.service';
import { invalidateAvailability } from '../availability/availability.service';

interface CreateInput {
  customerUserId: string;
  employeeId: string;
  serviceId: string;
  startAt: Date;
  notes?: string;
}

export async function createAppointment(input: CreateInput) {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service) throw BadRequest('שירות לא נמצא');
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    include: { user: true },
  });
  if (!employee) throw BadRequest('עובד לא נמצא');

  const endAt = new Date(input.startAt.getTime() + service.durationMin * 60_000);

  // Conflict check within transaction
  const created = await prisma.$transaction(async (tx) => {
    const overlap = await tx.appointment.findFirst({
      where: {
        employeeId: input.employeeId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [{ startAt: { lt: endAt } }, { endAt: { gt: input.startAt } }],
      },
    });
    if (overlap) throw Conflict('הסלוט כבר תפוס');

    return tx.appointment.create({
      data: {
        customerId: input.customerUserId,
        employeeId: input.employeeId,
        serviceId: input.serviceId,
        startAt: input.startAt,
        endAt,
        priceAgorot: service.priceAgorot,
        notes: input.notes,
        status: 'PENDING',
      },
      include: {
        service: true,
        employee: { include: { user: true } },
        customer: { select: { id: true, fullName: true, phone: true, email: true } },
      },
    });
  });

  await forceReleaseAfterBooking(input.employeeId, input.startAt);
  await invalidateAvailability(input.employeeId, input.startAt);

  emitAppointmentEvent('appointment.created', {
    id: created.id,
    employeeUserId: employee.userId,
    customerId: created.customerId,
    appointment: created,
  });

  return created;
}

export async function listAppointments(params: {
  user: { sub: string; role: 'ADMIN' | 'BARBER' | 'CUSTOMER' };
  from?: Date;
  to?: Date;
  employeeId?: string;
  status?: AppointmentStatus;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (params.user.role === 'CUSTOMER') {
    where.customerId = params.user.sub;
  } else if (params.user.role === 'BARBER') {
    const emp = await prisma.employee.findUnique({ where: { userId: params.user.sub } });
    if (!emp) throw NotFound('פרופיל עובד לא נמצא');
    where.employeeId = emp.id;
  } else if (params.employeeId) {
    where.employeeId = params.employeeId;
  }

  if (params.from) where.startAt = { ...(where.startAt as object), gte: params.from };
  if (params.to) where.startAt = { ...(where.startAt as object), lte: params.to };
  if (params.status) where.status = params.status;

  return prisma.appointment.findMany({
    where,
    include: {
      service: true,
      employee: { include: { user: { select: { id: true, fullName: true } } } },
      customer: { select: { id: true, fullName: true, phone: true, email: true } },
      payment: true,
    },
    orderBy: { startAt: 'asc' },
  });
}

export async function getAppointment(id: string, user: { sub: string; role: string }) {
  const a = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: true,
      employee: { include: { user: true } },
      customer: { select: { id: true, fullName: true, phone: true, email: true } },
      payment: true,
    },
  });
  if (!a) throw NotFound();
  if (user.role === 'CUSTOMER' && a.customerId !== user.sub) throw Forbidden();
  if (user.role === 'BARBER' && a.employee.userId !== user.sub) throw Forbidden();
  return a;
}

export async function updateAppointment(
  id: string,
  user: { sub: string; role: string },
  patch: { startAt?: Date; status?: AppointmentStatus; notes?: string; employeeId?: string },
) {
  const existing = await prisma.appointment.findUnique({
    where: { id },
    include: { employee: true, service: true },
  });
  if (!existing) throw NotFound();

  if (user.role === 'CUSTOMER') {
    if (existing.customerId !== user.sub) throw Forbidden();
    if (patch.status && patch.status !== 'CANCELLED') throw Forbidden('לקוח רשאי רק לבטל');
  } else if (user.role === 'BARBER') {
    const emp = await prisma.employee.findUnique({ where: { userId: user.sub } });
    if (!emp || existing.employeeId !== emp.id) throw Forbidden();
  }

  const targetEmployeeId = patch.employeeId ?? existing.employeeId;
  const targetStart = patch.startAt ?? existing.startAt;
  const targetEnd =
    patch.startAt || patch.employeeId
      ? new Date(targetStart.getTime() + existing.service.durationMin * 60_000)
      : existing.endAt;

  if (patch.startAt || patch.employeeId) {
    const overlap = await prisma.appointment.findFirst({
      where: {
        id: { not: id },
        employeeId: targetEmployeeId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [{ startAt: { lt: targetEnd } }, { endAt: { gt: targetStart } }],
      },
    });
    if (overlap) throw Conflict('הסלוט החדש תפוס');
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...(patch.startAt && { startAt: targetStart, endAt: targetEnd }),
      ...(patch.employeeId && { employeeId: targetEmployeeId }),
      ...(patch.status && { status: patch.status }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
    },
    include: {
      service: true,
      employee: { include: { user: true } },
      customer: { select: { id: true, fullName: true, phone: true } },
    },
  });

  await invalidateAvailability(existing.employeeId, existing.startAt);
  if (patch.startAt || patch.employeeId) {
    await invalidateAvailability(targetEmployeeId, targetStart);
  }

  emitAppointmentEvent(
    patch.status ? 'appointment.status_changed' : 'appointment.updated',
    {
      id: updated.id,
      employeeUserId: updated.employee.userId,
      customerId: updated.customerId,
      appointment: updated,
    },
  );

  return { before: existing, after: updated };
}

export async function deleteAppointment(id: string, user: { sub: string; role: string }) {
  const existing = await prisma.appointment.findUnique({
    where: { id },
    include: { employee: { include: { user: true } } },
  });
  if (!existing) throw NotFound();

  if (user.role === 'CUSTOMER' && existing.customerId !== user.sub) throw Forbidden();
  if (user.role === 'BARBER') {
    const emp = await prisma.employee.findUnique({ where: { userId: user.sub } });
    if (!emp || existing.employeeId !== emp.id) throw Forbidden();
  }

  const cancelled = await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  await invalidateAvailability(existing.employeeId, existing.startAt);

  emitAppointmentEvent('appointment.deleted', {
    id: cancelled.id,
    employeeUserId: existing.employee.userId,
    customerId: existing.customerId,
  });

  return cancelled;
}
