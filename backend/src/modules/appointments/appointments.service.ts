import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import type { AppointmentStatus } from '../../types/db';
import { AppError, BadRequest, Conflict, NotFound, Forbidden } from '../../lib/errors';
import { emitAppointmentEvent } from '../../lib/socket';
import { forceReleaseAfterBooking } from './locking.service';
import { acquireLock, releaseLock } from '../../lib/redis';
import { invalidateAvailability } from '../availability/availability.service';
import { sendPushToRole } from '../../lib/push';
import { logger } from '../../lib/logger';
import { getBusinessSettings } from '../../lib/businessSettings';
import { createToken as createCancelToken } from './cancel-tokens.service';

const CREATE_LOCK_TTL_SEC = 15;
function createLockKey(employeeId: string, startISO: string): string {
  return `lock:create:${employeeId}:${startISO}`;
}

function generateConfirmationCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return `BB-${code}`;
}

async function uniqueConfirmationCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateConfirmationCode();
    const exists = await prisma.appointment.findUnique({ where: { confirmationCode: code } });
    if (!exists) return code;
  }
  // Fall back with extra entropy
  return `BB-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

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
  const confirmationCode = await uniqueConfirmationCode();

  // Look up customer's no-show history + business settings to decide on deposit.
  const customerRow = await prisma.customer.findUnique({
    where: { userId: input.customerUserId },
    select: { noShowCount: true },
  });
  const settings = await getBusinessSettings();
  const noShowCount = customerRow?.noShowCount ?? 0;
  const threshold = settings?.noShowThreshold ?? 1;
  const depositRequired = !!(settings?.requireDeposit && noShowCount >= threshold);

  // Race protection: acquire a short Redis lock on (employee, startAt) before the
  // conflict-check transaction so two concurrent creates can't both pass the check.
  const startISO = input.startAt.toISOString();
  const lockKey = createLockKey(input.employeeId, startISO);
  const lockValue = crypto.randomBytes(8).toString('hex');
  const gotLock = await acquireLock(lockKey, CREATE_LOCK_TTL_SEC, lockValue);
  if (!gotLock) {
    throw new AppError(409, 'slot_taken', 'התור הזה זה עתה נתפס');
  }

  let created;
  try {
    // Conflict check within transaction
    created = await prisma.$transaction(async (tx) => {
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
          confirmationCode,
          depositRequired,
        },
        include: {
          service: true,
          employee: { include: { user: true } },
          customer: { select: { id: true, fullName: true, phone: true, email: true } },
        },
      });
    });
  } finally {
    await releaseLock(lockKey, lockValue).catch(() => { /* lock may have expired — ignore */ });
  }

  // Self-cancel token — valid until appointment endAt.
  let cancelToken: string | undefined;
  if (settings?.allowSelfCancel) {
    try {
      cancelToken = await createCancelToken(created.id, created.endAt);
    } catch (err) {
      logger.warn({ err, apptId: created.id }, 'Failed to create cancel token');
    }
  }

  // Build Bit deposit link when applicable.
  let depositBitLink: string | undefined;
  if (
    depositRequired &&
    settings &&
    (settings.depositMethod === 'BIT_LINK' || settings.depositMethod === 'BOTH') &&
    settings.bitPhone
  ) {
    const normalizedBitPhone = settings.bitPhone.replace(/[^\d]/g, '');
    const amountIls = (settings.depositAgorot ?? 0) / 100;
    depositBitLink = `https://www.bitpay.co.il/app/me/${normalizedBitPhone}?amount=${amountIls}`;
  }

  await forceReleaseAfterBooking(input.employeeId, input.startAt);
  await invalidateAvailability(input.employeeId, input.startAt);

  emitAppointmentEvent('appointment.created', {
    id: created.id,
    employeeUserId: employee.userId,
    customerId: created.customerId,
    appointment: created,
  });

  // Fire-and-forget push notifications to staff
  try {
    const timeStr = created.startAt.toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jerusalem',
    });
    const customerName = created.customer?.fullName ?? 'לקוח';
    const payload = {
      title: '🆕 תור חדש',
      body: `${customerName} · ${created.service.name} · ${timeStr}`,
      url: '/admin/calendar',
      tag: `appointment-${created.id}`,
    };
    void sendPushToRole('BARBER', payload).catch((err) =>
      logger.warn({ err }, 'Push to BARBER failed'),
    );
    void sendPushToRole('ADMIN', payload).catch((err) =>
      logger.warn({ err }, 'Push to ADMIN failed'),
    );
  } catch (err) {
    logger.warn({ err }, 'Failed to dispatch new-appointment push');
  }

  return { ...created, depositRequired, depositBitLink, cancelToken };
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
