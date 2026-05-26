'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { PhotoMark } from '@/components/brand/PhotoMark';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

const DEFAULT_CANCELLATION = [
  'מדיניות ביטולים — בהתאם לחוק הגנת הצרכן, התשמ"א-1981.',
  '',
  'ניתן לבטל תור עד 4 שעות לפני המועד — ללא דמי ביטול.',
  'ביטול מאוחר עלול לחייב בדמי ביטול בהתאם לחוק.',
  '',
  'אזרחים ותיקים, אנשים עם מוגבלות ועולים חדשים — חלות הוראות ביטול מקלות בהתאם לחוק.',
].join('\n');

const DEFAULT_REFUND = [
  'מדיניות החזרים:',
  '',
  'החזרים בגין פיקדון שבוטל במועד יבוצעו תוך 14 ימי עסקים לאמצעי התשלום המקורי.',
].join('\n');

export default function CancellationPolicyPage() {
  const { data: settings, isLoading } = useBusinessSettings();

  const cancellation = settings?.cancellationPolicyText || DEFAULT_CANCELLATION;
  const refund = settings?.refundPolicyText || DEFAULT_REFUND;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-secondary/30">
      <header className="border-b backdrop-blur-md bg-background/80 sticky top-0 z-30">
        <div className="container max-w-3xl flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <PhotoMark size="sm" />
            <span className="font-display font-black text-lg group-hover:text-primary transition-colors">בר אברג׳יל</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container max-w-3xl py-8 px-4 space-y-6">
        <div>
          <h1 className="font-display font-black text-3xl sm:text-4xl mb-2">מדיניות ביטולים והחזרים</h1>
          <p className="text-sm text-muted-foreground">
            בהתאם להוראות חוק הגנת הצרכן, התשמ&quot;א-1981 ותקנות עסקת מכר מרחוק.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            <Card className="p-6">
              <h2 className="font-display font-bold text-xl mb-3">מדיניות ביטולים</h2>
              <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {cancellation}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-display font-bold text-xl mb-3">מדיניות החזרים</h2>
              <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {refund}
              </div>
            </Card>

            <Card className="p-6 bg-secondary/40">
              <h2 className="font-display font-bold text-lg mb-2">אופן הביטול</h2>
              <ul className="text-sm leading-relaxed space-y-1 list-disc list-inside">
                <li>דרך הקישור באישור התור שנשלח אליך</li>
                <li>דרך הדף &quot;התורים שלי&quot; באתר</li>
                <li>בפנייה ישירה למספרה — בטלפון או בוואטסאפ</li>
              </ul>
            </Card>
          </>
        )}

        <div className="text-center pt-2">
          <Button asChild variant="ghost">
            <Link href="/">חזרה לדף הבית</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
