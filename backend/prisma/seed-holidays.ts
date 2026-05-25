/**
 * Auto-seed Israeli holiday closures as global time-off.
 * Run independently with: npx tsx prisma/seed-holidays.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Gregorian dates of major Jewish holidays
// Source: Hebcal — verified for the years below.
// Format: { name, from (Y-M-D), to (Y-M-D inclusive) }
const HOLIDAYS = [
  // 2026
  { name: 'פסח (חג ראשון)', from: '2026-04-02', to: '2026-04-02' },
  { name: 'פסח (חג שביעי)', from: '2026-04-08', to: '2026-04-08' },
  { name: 'יום העצמאות', from: '2026-04-22', to: '2026-04-22' },
  { name: 'ל״ג בעומר', from: '2026-05-05', to: '2026-05-05' },
  { name: 'שבועות', from: '2026-05-22', to: '2026-05-22' },
  { name: 'תשעה באב', from: '2026-07-23', to: '2026-07-23' },
  { name: 'ראש השנה', from: '2026-09-12', to: '2026-09-13' },
  { name: 'יום כיפור', from: '2026-09-21', to: '2026-09-21' },
  { name: 'סוכות (חג ראשון)', from: '2026-09-26', to: '2026-09-26' },
  { name: 'שמחת תורה', from: '2026-10-03', to: '2026-10-03' },
  { name: 'חנוכה (ערב)', from: '2026-12-04', to: '2026-12-04' },

  // 2027
  { name: 'פורים', from: '2027-03-23', to: '2027-03-23' },
  { name: 'פסח (חג ראשון)', from: '2027-04-22', to: '2027-04-22' },
  { name: 'פסח (חג שביעי)', from: '2027-04-28', to: '2027-04-28' },
  { name: 'יום העצמאות', from: '2027-05-12', to: '2027-05-12' },
  { name: 'ל״ג בעומר', from: '2027-05-25', to: '2027-05-25' },
  { name: 'שבועות', from: '2027-06-11', to: '2027-06-11' },
  { name: 'ראש השנה', from: '2027-10-02', to: '2027-10-03' },
  { name: 'יום כיפור', from: '2027-10-11', to: '2027-10-11' },
  { name: 'סוכות (חג ראשון)', from: '2027-10-16', to: '2027-10-16' },
  { name: 'שמחת תורה', from: '2027-10-23', to: '2027-10-23' },
];

async function main() {
  console.log(`🕎 Seeding ${HOLIDAYS.length} Israeli holidays...`);
  let added = 0;
  for (const h of HOLIDAYS) {
    const startDate = new Date(`${h.from}T00:00:00.000Z`);
    const endDate = new Date(`${h.to}T23:59:00.000Z`);

    // Idempotency: skip if same isGlobal+startDate already exists
    const existing = await prisma.timeOff.findFirst({
      where: { isGlobal: true, startDate, reason: h.name },
    });
    if (existing) continue;

    await prisma.timeOff.create({
      data: {
        employeeId: null,
        isGlobal: true,
        startDate,
        endDate,
        reason: h.name,
      },
    });
    added++;
  }
  console.log(`✅ Added ${added} holidays.`);
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
