import { prisma } from '../../lib/prisma';
import { cacheGet, cacheSet } from '../../lib/redis';

const SLOT_STEP_MIN = 15;

interface Slot {
  start: string; // ISO
  end: string;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function dateAtMinutes(date: Date, minutes: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Compute available slots for an employee on a given date for a given service.
 */
export async function getAvailableSlots(params: {
  employeeId: string;
  date: Date; // any time on the target day (we normalize)
  serviceId: string;
}): Promise<Slot[]> {
  const { employeeId, serviceId } = params;
  const date = new Date(params.date);
  date.setHours(0, 0, 0, 0);
  const dayOfWeek = date.getDay();

  const cacheKey = `avail:${employeeId}:${date.toISOString().slice(0, 10)}:${serviceId}`;
  const cached = await cacheGet<Slot[]>(cacheKey);
  if (cached) return cached;

  const [service, wh, timeOff, appointments] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.workingHour.findFirst({ where: { employeeId, dayOfWeek } }),
    prisma.timeOff.findMany({
      where: {
        OR: [{ employeeId }, { isGlobal: true }],
        startDate: { lte: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
        endDate: { gte: date },
      },
    }),
    prisma.appointment.findMany({
      where: {
        employeeId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startAt: { gte: date, lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  if (!service || !wh) return [];

  // Closed day if any global time-off covers it
  const isClosed = timeOff.some((t) => t.isGlobal || (t.employeeId === employeeId));
  if (isClosed) return [];

  const start = toMinutes(wh.startTime);
  const end = toMinutes(wh.endTime);
  const brkStart = wh.breakStart ? toMinutes(wh.breakStart) : null;
  const brkEnd = wh.breakEnd ? toMinutes(wh.breakEnd) : null;

  const slots: Slot[] = [];
  const now = new Date();

  for (let m = start; m + service.durationMin <= end; m += SLOT_STEP_MIN) {
    if (brkStart !== null && brkEnd !== null && m < brkEnd && m + service.durationMin > brkStart) continue;

    const slotStart = dateAtMinutes(date, m);
    const slotEnd = dateAtMinutes(date, m + service.durationMin);

    if (slotStart < now) continue;

    const conflict = appointments.some((a) =>
      overlaps(slotStart, slotEnd, a.startAt, a.endAt),
    );
    if (conflict) continue;

    slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
  }

  await cacheSet(cacheKey, slots, 60);
  return slots;
}

export async function invalidateAvailability(employeeId: string, date: Date): Promise<void> {
  const dayStr = new Date(date).toISOString().slice(0, 10);
  const { cacheInvalidate } = await import('../../lib/redis');
  await cacheInvalidate(`avail:${employeeId}:${dayStr}:*`);
}
