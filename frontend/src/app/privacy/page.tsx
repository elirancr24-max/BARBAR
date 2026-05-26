'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

function defaultPrivacy(businessName: string, taxId: string | null | undefined): string {
  const today = new Date().toLocaleDateString('he-IL');
  const idLine = taxId ? `\nע.מ./ח.פ.: ${taxId}` : '';
  return `מדיניות פרטיות — ${businessName}

עודכן לאחרונה: ${today}

1. בעל השליטה במידע
בעל ומפעיל האתר: ${businessName} (להלן: "העסק").${idLine}
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
}

export default function PrivacyPage() {
  const { data: settings } = useBusinessSettings();
  const businessName = settings?.businessName || 'בר אברג׳יל · Hair Design';
  const text = settings?.privacyPolicyText && settings.privacyPolicyText.trim().length > 0
    ? settings.privacyPolicyText
    : defaultPrivacy(businessName, settings?.businessTaxId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container max-w-3xl py-4 flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-lg">{businessName}</Link>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowRight className="w-4 h-4" /> חזרה
          </Link>
        </div>
      </header>
      <main className="container max-w-3xl py-10 px-4">
        <h1 className="font-display font-black text-3xl mb-6">מדיניות פרטיות</h1>
        <article className="whitespace-pre-line leading-relaxed text-sm sm:text-base text-foreground/90">
          {text}
        </article>
        <div className="mt-10 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-primary">תנאי שימוש</Link>
          <span className="mx-2" aria-hidden>·</span>
          <Link href="/" className="hover:text-primary">דף הבית</Link>
        </div>
      </main>
    </div>
  );
}
