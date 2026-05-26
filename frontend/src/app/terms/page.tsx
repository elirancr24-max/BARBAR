'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

function defaultTerms(businessName: string, taxId: string | null | undefined): string {
  const today = new Date().toLocaleDateString('he-IL');
  const idLine = taxId ? `\nע.מ./ח.פ.: ${taxId}` : '';
  return `תנאי שימוש — ${businessName}

עודכן לאחרונה: ${today}

1. כללי
השימוש באתר ובמערכת קביעת התורים של ${businessName} ("העסק")${idLine ? idLine + '\n' : ' '}כפוף לתנאים אלה ולמדיניות הפרטיות. השימוש מהווה הסכמה לתנאים.

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
}

export default function TermsPage() {
  const { data: settings } = useBusinessSettings();
  const businessName = settings?.businessName || 'בר אברג׳יל · Hair Design';
  const text = settings?.termsOfServiceText && settings.termsOfServiceText.trim().length > 0
    ? settings.termsOfServiceText
    : defaultTerms(businessName, settings?.businessTaxId);

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
        <h1 className="font-display font-black text-3xl mb-6">תנאי שימוש</h1>
        <article className="whitespace-pre-line leading-relaxed text-sm sm:text-base text-foreground/90">
          {text}
        </article>
        <div className="mt-10 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-primary">מדיניות פרטיות</Link>
          <span className="mx-2" aria-hidden>·</span>
          <Link href="/" className="hover:text-primary">דף הבית</Link>
        </div>
      </main>
    </div>
  );
}
