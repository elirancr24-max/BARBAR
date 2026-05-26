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

  // --- BusinessSettings — defaults for Amendment 13 (תיקון 13) compliance ---
  const defaultPrivacy = `מדיניות פרטיות — בר אברג׳יל Hair Design

עודכן לאחרונה: ${new Date().toLocaleDateString('he-IL')}

1. בעל השליטה במידע
בעל ומפעיל האתר: בר אברג׳יל · Hair Design (להלן: "העסק").
ליצירת קשר בנושאי פרטיות: ניתן לפנות בטלפון או באימייל המופיעים בעמוד "צור קשר".

2. סוגי המידע הנאסף
שם מלא, טלפון, אימייל, תאריך לידה (אופציונלי), היסטוריית תורים, העדפות שירות, כתובת IP וקובצי Cookie.

3. מטרת השימוש
ניהול תורים ושירותי מספרה; שליחת תזכורות ואישורים; שירות לקוחות; ניהול היסטוריה רפואית/אלרגנים; שיווק ישיר בכפוף להסכמה.

4. בסיס חוקי
ביצוע חוזה (קביעת תור), חובה חוקית (ניהול ספרים), ואינטרס לגיטימי. שיווק ישיר רק לאחר הסכמה מפורשת בכתב.

5. תקופת שמירה
נתוני לקוח נשמרים כל עוד הלקוח פעיל ולמשך 7 שנים נוספות מתאריך הביקור האחרון, בהתאם לדרישות פקודת מס הכנסה. ניתן לבקש מחיקה מוקדמת בכפוף לחוק.

6. מקבלי המידע
המידע אינו מועבר לצדדים שלישיים, למעט: ספקי תשתית (אחסון, WhatsApp Business), רואה חשבון, ורשויות מוסמכות לפי דין.

7. זכויותיך לפי תיקון 13 לחוק הגנת הפרטיות (תשפ"ה-2025)
זכות עיון במידע · זכות תיקון · זכות מחיקה · זכות התנגדות לשימוש לצורכי שיווק · זכות לקבלת המידע בפורמט נייד.
לבקשה: יש לפנות לעסק בכתב.

8. אבטחת מידע
המידע מאוחסן בשרתים מאובטחים עם הצפנה. גישה מוגבלת לבעל העסק בלבד.

9. עוגיות (Cookies)
האתר משתמש בעוגיות חיוניות לתפקודו ולשמירת מצב התחברות. ניתן לחסום עוגיות בהגדרות הדפדפן.

10. שינויים במדיניות
העסק רשאי לעדכן מדיניות זו. שינויים מהותיים יוצגו באתר 14 יום לפני כניסתם לתוקף.`;

  const defaultTerms = `תנאי שימוש — בר אברג׳יל Hair Design

עודכן לאחרונה: ${new Date().toLocaleDateString('he-IL')}

1. כללי
השימוש באתר ובמערכת קביעת התורים של בר אברג׳יל · Hair Design ("העסק") כפוף לתנאים אלה ולמדיניות הפרטיות. השימוש מהווה הסכמה לתנאים.

2. קביעת תור וביטול
ניתן לקבוע תור באתר או טלפונית. ביטול עד 4 שעות לפני התור — ללא חיוב. ביטול מאוחר או אי-הגעה ("no-show") עלולים לחייב מקדמה בהזמנות הבאות.

3. תשלום
התשלום מתבצע במספרה בסיום השירות, אלא אם נדרשה מקדמה מראש. מחירים כוללים מע"מ.

4. אחריות
העסק עושה מאמצים לשמירה על איכות השירות. אין באמור באתר משום התחייבות לתוצאה ספציפית.

5. שימוש מותר
האתר מיועד לקביעת תורים בלבד. אסור לבצע פעולות פוגעניות, הזרקת קוד, גישה בלתי-מורשית או יצירת חשבונות מזויפים.

6. קניין רוחני
כל התכנים באתר (לוגו, עיצוב, תמונות, טקסטים) הם רכושו של העסק ואין להעתיקם ללא רשות בכתב.

7. שינויים בתנאים
העסק רשאי לעדכן את התנאים. המשך השימוש לאחר עדכון מהווה הסכמה לגרסה החדשה.

8. דין וסמכות שיפוט
על תנאים אלה יחולו דיני מדינת ישראל. סמכות השיפוט הבלעדית — בתי המשפט המוסמכים באילת.

9. יצירת קשר
לכל שאלה או בקשה ניתן לפנות לעסק בערוצים המפורסמים באתר.`;

  await prisma.businessSettings.upsert({
    where: { id: 'singleton' },
    update: {
      privacyPolicyText: defaultPrivacy,
      termsOfServiceText: defaultTerms,
    },
    create: {
      id: 'singleton',
      businessName: 'בר אברג׳יל · Hair Design',
      privacyPolicyText: defaultPrivacy,
      termsOfServiceText: defaultTerms,
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

  // --- Accessibility (IS 5568) defaults ---
  const accessibilityStatement = `הצהרת נגישות — בר אברג׳יל Hair Design

אנו במספרה רואים חשיבות עליונה בנגישות האתר עבור כלל הגולשים, לרבות אנשים עם מוגבלויות, בהתאם לתקן הישראלי ת"י 5568 ולחוק שוויון זכויות לאנשים עם מוגבלות.

פעולות שננקטו להנגשת האתר:
• תאימות לרמה AA של תקן WCAG 2.0.
• ניווט מלא באמצעות מקלדת.
• תמיכה בקוראי מסך (NVDA, JAWS, VoiceOver) עם תיאורי ARIA.
• ניגודיות צבעים מספקת לטקסט מול הרקע.
• קישור "דלג לתוכן המרכזי" בראש כל עמוד.
• תיאורים חלופיים (alt) לכל התמונות החיוניות.
• טפסים עם תוויות (label) ברורות.

מגבלות ידועות:
• חלק מהתמונות בגלריה הציבורית עשויות שלא לכלול תיאור מילולי מפורט.
• ממשק היומן (לוח שנה) דורש שימוש בעכבר לגרירת תורים — קיימת אפשרות עריכה חלופית באמצעות לחיצה.

נוהל פנייה בעניין נגישות:
ניתן לפנות לרכז הנגישות של העסק בכל בעיה, שאלה או בקשה לשיפור הנגישות. נשתדל לטפל בפנייה תוך פרק זמן סביר.

עודכן לאחרונה: ${new Date().toISOString().split('T')[0]}`;

  // --- Consumer Protection (חוק הגנת הצרכן) defaults ---
  const cancellationPolicyText = [
    'מדיניות ביטולים — בהתאם לחוק הגנת הצרכן, התשמ"א-1981 ותקנות עסקת מכר מרחוק.',
    '',
    '1. ביטול עסקה מקוונת:',
    '   ניתן לבטל תור שנקבע באמצעות האתר עד 14 ימים מיום קביעת התור, ובלבד שהביטול ייעשה לפחות שני ימי עבודה לפני מועד מתן השירות.',
    '',
    '2. ביטול ללא דמי ביטול:',
    '   ביטול עד 4 שעות לפני מועד התור — ללא דמי ביטול והחזר מלא אם שולם פיקדון.',
    '',
    '3. דמי ביטול:',
    '   ביטול שלא במועד שנקבע לעיל יחויב בדמי ביטול של 5% מערך השירות או 100 ש"ח, הנמוך מבין השניים, כקבוע בחוק הגנת הצרכן.',
    '',
    '4. ביטול בשל פגם בשירות:',
    '   במקרה של פגם בשירות, אי-התאמה או אי-קיום מצד העסק — לא ייגבו דמי ביטול והלקוח זכאי להחזר מלא.',
    '',
    '5. אוכלוסיות מיוחדות:',
    '   אזרחים ותיקים (65+), אנשים עם מוגבלות ועולים חדשים (עד 5 שנים מיום העלייה) — רשאים לבטל עסקה בתוך 4 חודשים ממועד ההזמנה, בכפוף לכך שטרם התקיים מועד מתן השירות.',
    '',
    '6. אופן הביטול:',
    '   ניתן לבטל דרך הקישור שנשלח באישור התור, דרך הדף "התורים שלי" באתר, או בפנייה ישירה לעסק בטלפון או בוואטסאפ.',
  ].join('\n');

  const refundPolicyText = [
    'מדיניות החזרים:',
    '',
    '1. תשלום פיקדון שבוטל במועד — יוחזר במלואו תוך 14 ימי עסקים לאמצעי התשלום ממנו בוצעה ההפקדה.',
    '',
    '2. תשלום פיקדון שבוטל לאחר מועד הקאט-אוף — יוחזר בניכוי דמי ביטול חוקיים (5% או 100 ש"ח, הנמוך מביניהם).',
    '',
    '3. במקרה של אי-הגעה (No-Show) — הפיקדון אינו מוחזר.',
    '',
    '4. בקשה להחזר תוגש באמצעות פנייה לעסק. במקרה של מחלוקת, ניתן לפנות לרשות הגנת הצרכן.',
  ].join('\n');

  await prisma.businessSettings.upsert({
    where: { id: 'singleton' },
    update: {
      accessibilityOfficerName: 'בר אברג׳יל',
      accessibilityOfficerPhone: '972500000001',
      accessibilityOfficerEmail: 'bar@barabargil.local',
      accessibilityStatementText: accessibilityStatement,
      cancellationPolicyText,
      refundPolicyText,
    },
    create: {
      id: 'singleton',
      businessName: 'בר אברג׳יל Hair Design',
      accessibilityOfficerName: 'בר אברג׳יל',
      accessibilityOfficerPhone: '972500000001',
      accessibilityOfficerEmail: 'bar@barabargil.local',
      accessibilityStatementText: accessibilityStatement,
      cancellationPolicyText,
      refundPolicyText,
    },
  });

  console.log('✅ Seed completed!');
  console.log('   Owner (Admin + Barber): bar@barabargil.local / Admin1234!');
  console.log('   Customer (demo):        customer@barabargil.local / Customer1234!');
  console.log('   📍 בניין העיגולים, אילת — ראשון-חמישי 10:00-20:00');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
