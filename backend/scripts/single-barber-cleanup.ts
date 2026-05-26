/**
 * One-shot cleanup: remove all non-primary employees and their data.
 *
 * Primary = the active Employee whose underlying User has the earliest createdAt.
 *
 * For every other Employee:
 *   1. Delete all Appointment rows referencing the employee (no FK cascade).
 *   2. Delete the Employee (cascades WorkingHour, TimeOff, ServicesOnEmployees).
 *   3. Attempt to delete the underlying User (if no remaining relations).
 *
 * Idempotent: if only one Employee already exists, exits with "nothing to do".
 */
import { PrismaClient } from '@prisma/client';
import { clearPrimaryEmployeeCache } from '../src/lib/singleEmployee';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    include: { user: { select: { id: true, fullName: true, email: true, createdAt: true } } },
    orderBy: { user: { createdAt: 'asc' } },
  });

  if (employees.length <= 1) {
    console.log(`✅ Nothing to do — ${employees.length} employee(s) present.`);
    return;
  }

  const primary = employees[0];
  const extras = employees.slice(1);

  console.log(`🔒 Keeping primary employee: ${primary.user.fullName} <${primary.user.email}> (id=${primary.id})`);
  console.log(`🗑  Removing ${extras.length} extra employee(s): ${extras.map((e) => e.user.fullName).join(', ')}`);

  let totalAppointments = 0;
  let totalEmployees = 0;
  let totalUsers = 0;

  for (const e of extras) {
    // 1. Delete appointments first (no cascade from Employee → Appointment)
    const apptResult = await prisma.appointment.deleteMany({ where: { employeeId: e.id } });
    totalAppointments += apptResult.count;
    console.log(`  · ${e.user.fullName}: deleted ${apptResult.count} appointment(s)`);

    // 2. Delete employee (cascades WorkingHour, TimeOff, ServicesOnEmployees)
    await prisma.employee.delete({ where: { id: e.id } });
    totalEmployees += 1;

    // 3. Try to delete underlying user (may fail if user has other relations)
    try {
      await prisma.user.delete({ where: { id: e.userId } });
      totalUsers += 1;
      console.log(`  · ${e.user.fullName}: user deleted`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  · ${e.user.fullName}: kept user (${msg.split('\n')[0]})`);
    }
  }

  clearPrimaryEmployeeCache();

  console.log('— Summary —');
  console.log(`  appointments deleted: ${totalAppointments}`);
  console.log(`  employees deleted:    ${totalEmployees}`);
  console.log(`  users deleted:        ${totalUsers}`);
}

main()
  .catch((e) => { console.error('❌ Cleanup failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
