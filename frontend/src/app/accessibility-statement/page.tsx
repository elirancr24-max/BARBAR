'use client';

import Link from 'next/link';
import { ArrowRight, Phone, Mail, Accessibility } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PhotoMark } from '@/components/brand/PhotoMark';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

const DEFAULT_STATEMENT = `הצהרת נגישות

אנו רואים חשיבות עליונה בנגישות האתר עבור כלל הגולשים, לרבות אנשים עם מוגבלויות, בהתאם לתקן הישראלי ת"י 5568 ולחוק שוויון זכויות לאנשים עם מוגבלות.

פעולות שננקטו להנגשת האתר:
• תאימות לרמה AA של תקן WCAG 2.0.
• ניווט מלא באמצעות מקלדת.
• תמיכה בקוראי מסך עם תיאורי ARIA.
• ניגודיות צבעים מספקת לטקסט מול הרקע.
• קישור "דלג לתוכן המרכזי" בראש כל עמוד.
• תיאורים חלופיים (alt) לכל התמונות החיוניות.
• טפסים עם תוויות (label) ברורות.

מגבלות ידועות:
• חלק מהתמונות בגלריה הציבורית עשויות שלא לכלול תיאור מילולי מפורט.
• ממשק היומן (לוח שנה) דורש שימוש בעכבר לגרירת תורים — קיימת אפשרות עריכה חלופית באמצעות לחיצה.

נוהל פנייה בעניין נגישות:
ניתן לפנות לרכז הנגישות של העסק בכל בעיה, שאלה או בקשה לשיפור הנגישות. נשתדל לטפל בפנייה תוך פרק זמן סביר.`;

export default function AccessibilityStatementPage() {
  const { data: settings } = useBusinessSettings();

  const businessName = settings?.businessName || 'בר אברג׳יל';
  const text = settings?.accessibilityStatementText || DEFAULT_STATEMENT;
  const officerName = settings?.accessibilityOfficerName || businessName;
  const officerPhone = settings?.accessibilityOfficerPhone || settings?.businessPhone || '';
  const officerEmail = settings?.accessibilityOfficerEmail || '';

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-secondary/30 pb-20 lg:pb-10">
      <header className="border-b backdrop-blur-md bg-background/80 sticky top-0 z-30">
        <div className="container max-w-5xl flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <PhotoMark size="sm" />
            <span className="font-display font-black text-lg group-hover:text-primary transition-colors">
              {businessName}
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container max-w-3xl px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <Accessibility className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight">
            הצהרת נגישות
          </h1>
          <p className="text-sm text-muted-foreground mt-2">בהתאם לתקן ישראלי ת"י 5568 (WCAG 2.0 AA)</p>
        </div>

        <Card className="p-6 sm:p-8 mb-6">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{text}</p>
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="font-display font-bold text-xl mb-4">פרטי רכז הנגישות</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <dt className="text-muted-foreground min-w-[80px]">שם:</dt>
              <dd className="font-medium">{officerName}</dd>
            </div>
            {officerPhone && (
              <div className="flex items-start gap-3">
                <dt className="text-muted-foreground min-w-[80px]">טלפון:</dt>
                <dd>
                  <a
                    href={`tel:${officerPhone.replace(/[^0-9+]/g, '')}`}
                    className="font-medium text-primary hover:underline tabular-nums"
                    aria-label={`התקשר לרכז הנגישות ${officerPhone}`}
                  >
                    <Phone className="w-4 h-4 inline ms-1" aria-hidden="true" />
                    {officerPhone}
                  </a>
                </dd>
              </div>
            )}
            {officerEmail && (
              <div className="flex items-start gap-3">
                <dt className="text-muted-foreground min-w-[80px]">דוא"ל:</dt>
                <dd>
                  <a
                    href={`mailto:${officerEmail}`}
                    className="font-medium text-primary hover:underline break-all"
                    aria-label={`שלח דוא"ל לרכז הנגישות ${officerEmail}`}
                  >
                    <Mail className="w-4 h-4 inline ms-1" aria-hidden="true" />
                    {officerEmail}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <div className="text-center mt-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowRight className="w-3 h-3 inline ms-1" aria-hidden="true" /> חזרה לעמוד הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
