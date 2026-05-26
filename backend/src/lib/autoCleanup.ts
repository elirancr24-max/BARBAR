/**
 * Auto-cleanup: ensures a single active employee on startup.
 *
 * Idempotent — exits quickly when only one employee is present.
 * Runs once on process boot from `src/index.ts` so production
 * deploys don't require a manual cleanup script.
 */
import { prisma } from './prisma';
import { logger } from './logger';
import { clearPrimaryEmployeeCache } from './singleEmployee';

export async function runSingleBarberCleanup(): Promise<void> {
  try {
    const employees = await prisma.employee.findMany({
      include: { user: { select: { id: true, fullName: true, email: true, createdAt: true } } },
      orderBy: { user: { createdAt: 'asc' } },
    });

    if (employees.length <= 1) return;

    const primary = employees[0];
    const extras = employees.slice(1);

    logger.info(
      { keep: primary.user.email, remove: extras.map((e) => e.user.email) },
      '🧹 single-barber-cleanup: removing extra employees',
    );

    let appts = 0;
    let removed = 0;
    let users = 0;

    for (const e of extras) {
      const ar = await prisma.appointment.deleteMany({ where: { employeeId: e.id } });
      appts += ar.count;
      await prisma.employee.delete({ where: { id: e.id } });
      removed += 1;
      try {
        await prisma.user.delete({ where: { id: e.userId } });
        users += 1;
      } catch (err) {
        logger.warn({ err, userId: e.userId }, 'kept user (still has relations)');
      }
    }

    clearPrimaryEmployeeCache();
    logger.info(
      { appts, removed, users },
      '✅ single-barber-cleanup done',
    );
  } catch (err) {
    // Don't crash the server on cleanup failure — just log it.
    logger.error({ err }, 'single-barber-cleanup failed (continuing startup)');
  }
}
