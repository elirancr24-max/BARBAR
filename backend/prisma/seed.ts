import { PrismaClient } from '@prisma/client';
const Role = { ADMIN: 'ADMIN', BARBER: 'BARBER', CUSTOMER: 'CUSTOMER' } as const;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database — בר אברג׳יל Hair Design');

  // --- Users ---
  const adminPwd = await bcrypt.hash('Admin1234!', 12);
  const customerPwd = await bcrypt.hash('Customer1234!', 12);

  // Bar — owner & admin (his own salon, the sole barber)
  const barUser = await prisma.user.upsert({
    where: { email: 'bar@barabargil.local' },
    update: { fullName: 'בר אברג׳יל', phone: '972500000001' },
    create: {
      email: 'bar@barabargil.local',
      phone: '972500000001',
      passwordHash: adminPwd,
      fullName: 'בר אברג׳יל',
      role: Role.ADMIN,
    },
  });

  // Demo customer
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@barabargil.local' },
    update: {},
    create: {
      email: 'customer@barabargil.local',
      phone: '972500000004',
      passwordHash: customerPwd,
      fullName: 'אבי ישראלי',
      role: Role.CUSTOMER,
    },
  });

  // --- Employees ---
  // Single barber: Bar (the owner)
  const bar = await prisma.employee.upsert({
    where: { userId: barUser.id },
    update: { bio: 'בעל המספרה · ספר ראשי', color: '#c9a961' },
    create: {
      userId: barUser.id,
      bio: 'בעל המספרה · ספר ראשי',
      color: '#c9a961', // gold
    },
  });

  // --- Customer ---
  await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: { userId: customerUser.id, notes: 'לקוח קבוע' },
  });

  // --- Services ---
  const services = [
    { name: 'תספורת גברים', description: 'תספורת מלאה כולל שטיפה', durationMin: 30, priceAgorot: 8000, color: '#0ea5e9' },
    { name: 'עיצוב זקן', description: 'גילוח וסידור זקן', durationMin: 20, priceAgorot: 5000, color: '#10b981' },
    { name: 'תספורת + זקן', description: 'תספורת מלאה + עיצוב זקן', durationMin: 45, priceAgorot: 11000, color: '#c9a961' },
    { name: 'תספורת ילדים', description: 'גילאי 3-12', durationMin: 25, priceAgorot: 6000, color: '#ec4899' },
    { name: 'תספורת + פן', description: 'תספורת + פן ועיצוב', durationMin: 40, priceAgorot: 10000, color: '#f59e0b' },
    { name: 'גילוח מסורתי', description: 'גילוח עם מגבת חמה ותער', durationMin: 30, priceAgorot: 7000, color: '#8b5cf6' },
  ];

  for (const svc of services) {
    const existing = await prisma.service.findFirst({ where: { name: svc.name } });
    const service = existing
      ? await prisma.service.update({ where: { id: existing.id }, data: svc })
      : await prisma.service.create({ data: svc });

    // Sole barber provides every service
    await prisma.servicesOnEmployees.upsert({
      where: { serviceId_employeeId: { serviceId: service.id, employeeId: bar.id } },
      update: {},
      create: { serviceId: service.id, employeeId: bar.id },
    });
  }

  // --- Working Hours — Sun-Thu 10:00-20:00, Fri-Sat CLOSED ---
  // dayOfWeek: 0=Sunday, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri (closed), 6=Sat (closed)
  const workdays = [0, 1, 2, 3, 4];
  for (const dow of workdays) {
    await prisma.workingHour.upsert({
      where: { employeeId_dayOfWeek: { employeeId: bar.id, dayOfWeek: dow } },
      update: { startTime: '10:00', endTime: '20:00', breakStart: null, breakEnd: null },
      create: {
        employeeId: bar.id,
        dayOfWeek: dow,
        startTime: '10:00',
        endTime: '20:00',
      },
    });
  }

  // Remove any Friday/Saturday hours (if existed from old seed)
  await prisma.workingHour.deleteMany({
    where: {
      employeeId: bar.id,
      dayOfWeek: { in: [5, 6] },
    },
  });

  // --- Feature Flags ---
  const flags = [
    { key: 'online_payments', enabled: false, description: 'סליקה אונליין דרך Tranzila' },
    { key: 'whatsapp_auto_send', enabled: false, description: 'שליחה אוטומטית של הודעות WhatsApp' },
    { key: 'loyalty_program', enabled: false, description: 'מועדון לקוחות ונקודות' },
    { key: 'multi_tenant', enabled: false, description: 'תמיכה במספר עסקים (SaaS)' },
    { key: 'sms_reminders', enabled: false, description: 'תזכורות SMS אוטומטיות' },
    { key: 'realtime_calendar', enabled: true, description: 'עדכוני יומן בזמן אמת (Socket.IO)' },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { description: flag.description },
      create: flag,
    });
  }

  console.log('✅ Seed completed!');
  console.log('   Owner (Admin + Barber): bar@barabargil.local / Admin1234!');
  console.log('   Customer (demo):        customer@barabargil.local / Customer1234!');
  console.log('   📍 בניין העיגולים, אילת — ראשון-חמישי 10:00-20:00');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
