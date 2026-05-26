import { prisma } from './prisma';
import { logger } from './logger';
import { writeAudit } from '../middleware/audit';

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const GRACE_MS = 30 * 60 * 1000; // wait 30 min after appointment end before marking no-show
const INITIAL_DELAY_MS = 10_000;

async function runNoShowTick(): Promise<void> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - GRACE_MS);
  try {
    const stale = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        endAt: { lt: cutoff },
        checkedInAt: null,
      },
      select: { id: true, customerId: true, employeeId: true, startAt: true },
      take: 200,
    });

    if (stale.length === 0) return;
    logger.info({ count: stale.length }, '🚫 No-show tick: appointments to mark');

    for (const appt of stale) {
      try {
        await prisma.$transaction(async (tx) => {
          const updated = await tx.appointment.updateMany({
            where: { id: appt.id, status: 'CONFIRMED', checkedInAt: null },
            data: { status: 'NO_SHOW' },
          });
          if (updated.count === 0) return;

          // Update customer no-show counters (find by userId).
          const customer = await tx.customer.findUnique({ where: { userId: appt.customerId } });
          if (customer) {
            await tx.customer.update({
              where: { id: customer.id },
              data: {
                noShowCount: { increment: 1 },
                lastNoShowAt: now,
              },
            });
          }
        });

        await writeAudit({
          actorId: null,
          actorRole: 'SYSTEM',
          action: 'appointment.auto_no_show',
          entityType: 'Appointment',
          entityId: appt.id,
          after: { status: 'NO_SHOW', markedAt: now.toISOString() },
        });
      } catch (err) {
        logger.warn({ err, apptId: appt.id }, 'No-show update failed for appointment');
      }
    }
  } catch (err) {
    logger.error({ err }, 'No-show tick failed');
  }
}

export function startNoShowCron(): void {
  logger.info('🚫 No-show cron scheduled (every 30 minutes)');
  setTimeout(() => {
    void runNoShowTick();
    setInterval(() => {
      void runNoShowTick();
    }, INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}
