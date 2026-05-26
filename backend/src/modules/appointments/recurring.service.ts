import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';
import { createAppointment } from './appointments.service';
import { BadRequest } from '../../lib/errors';

export type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

interface CreateRecurringInput {
  customerUserId: string;
  employeeId: string;
  serviceId: string;
  startAt: Date;
  notes?: string;
  frequency: Frequency;
  count: number; // 2..24
}

export async function createRecurringSeries(input: CreateRecurringInput) {
  if (input.count < 2 || input.count > 24) {
    throw BadRequest('מספר התורים בסדרה חייב להיות בין 2 ל-24');
  }
  const seriesId = `rs_${randomUUID()}`;
  const startTimes: Date[] = [];
  for (let i = 0; i < input.count; i++) {
    const d = new Date(input.startAt);
    if (input.frequency === 'WEEKLY') d.setDate(d.getDate() + 7 * i);
    else if (input.frequency === 'BIWEEKLY') d.setDate(d.getDate() + 14 * i);
    else d.setMonth(d.getMonth() + i);
    startTimes.push(d);
  }

  const created: { id: string; startAt: Date }[] = [];
  try {
    for (const startAt of startTimes) {
      const a = await createAppointment({
        customerUserId: input.customerUserId,
        employeeId: input.employeeId,
        serviceId: input.serviceId,
        startAt,
        notes: input.notes,
      });
      await prisma.appointment.update({
        where: { id: a.id },
        data: { recurringSeriesId: seriesId },
      });
      created.push({ id: a.id, startAt: a.startAt });
    }
    return { seriesId, appointments: created };
  } catch (err) {
    if (created.length) {
      await prisma.appointment.deleteMany({
        where: { id: { in: created.map((c) => c.id) } },
      });
    }
    throw err;
  }
}

export async function listSeries(seriesId: string) {
  return prisma.appointment.findMany({
    where: { recurringSeriesId: seriesId },
    orderBy: { startAt: 'asc' },
    include: { service: true, employee: { include: { user: true } } },
  });
}

export async function cancelSeries(seriesId: string) {
  const updated = await prisma.appointment.updateMany({
    where: {
      recurringSeriesId: seriesId,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    data: { status: 'CANCELLED' },
  });
  return { cancelled: updated.count };
}
