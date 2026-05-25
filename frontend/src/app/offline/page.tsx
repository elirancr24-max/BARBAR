'use client';

import Link from 'next/link';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoMark } from '@/components/brand/PhotoMark';

export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center bg-background">
      <PhotoMark size="xl" />
      <div className="w-16 h-16 mt-6 rounded-full bg-muted flex items-center justify-center">
        <WifiOff className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="font-display text-2xl font-bold mt-6">אין חיבור לאינטרנט</h1>
      <p className="text-muted-foreground mt-2 max-w-sm">
        בדוק את החיבור שלך ונסה שוב. הדפים שביקרת בהם זמינים גם במצב לא מקוון.
      </p>
      <Button onClick={() => window.location.reload()} variant="gold" className="mt-8">
        <RefreshCw className="w-4 h-4 ms-2" />
        נסה שוב
      </Button>
      <Link href="/" className="text-sm text-muted-foreground mt-3 hover:text-primary">
        חזרה לדף הבית
      </Link>
    </div>
  );
}
