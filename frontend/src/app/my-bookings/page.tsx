'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, Clock, User as UserIcon, Scissors, CheckCircle2, XCircle, AlertCircle, Plus, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PhotoMark } from '@/components/brand/PhotoMark';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { api } from '@/lib/api';
import { formatAgorot, formatDateHe, formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MyBooking {
  id: string;
  confirmationCode: string;
  customerName: string;
  serviceName: string;
  serviceColor: string;
  employeeName: string;
  employeePhone: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  priceAgorot: number;
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING:   { label: 'ממתין לאישור', bg: 'bg-amber-500/15',   text: 'text-amber-700 dark:text-amber-400',     icon: AlertCircle },
  CONFIRMED: { label: 'אושר',          bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
  COMPLETED: { label: 'הושלם',         bg: 'bg-blue-500/15',    text: 'text-blue-700 dark:text-blue-400',       icon: CheckCircle2 },
  CANCELLED: { label: 'בוטל',          bg: 'bg-red-500/15',     text: 'text-red-700 dark:text-red-400',         icon: XCircle },
  NO_SHOW:   { label: 'לא הגיע',       bg: 'bg-orange-500/15',  text: 'text-orange-700 dark:text-orange-400',   icon: XCircle },
};

export default function MyBookingsPage() {
  const [codes, setCodes] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored: string[] = JSON.parse(localStorage.getItem('barbar:codes') || '[]');
      setCodes(stored);
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-bookings', codes.join(',')],
    enabled: ready && codes.length > 0,
    queryFn: async () => {
      const { data } = await api.post<{ bookings: MyBooking[] }>('/bookings/lookup', { codes });
      return data.bookings;
    },
  });

  const upcoming = (data || []).filter((b) => new Date(b.endAt) >= new Date() && b.status !== 'CANCELLED');
  const past = (data || []).filter((b) => new Date(b.endAt) < new Date() || b.status === 'CANCELLED');

  function forgetCode(code: string) {
    const next = codes.filter((c) => c !== code);
    setCodes(next);
    localStorage.setItem('barbar:codes', JSON.stringify(next));
    setTimeout(() => refetch(), 100);
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-secondary/30 pb-20 lg:pb-10">
      <header className="border-b backdrop-blur-md bg-background/80 sticky top-0 z-30">
        <div className="container max-w-3xl flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <PhotoMark size="sm" />
            <span className="font-display font-black text-lg group-hover:text-primary transition-colors">בר אברג׳יל</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container max-w-3xl py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-display font-black text-3xl sm:text-4xl mb-2">התורים שלי</h1>
          <p className="text-muted-foreground">כל ההזמנות שביצעת מהמכשיר הזה</p>
        </motion.div>

        {!ready || isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 animate-pulse h-32" />
            ))}
          </div>
        ) : codes.length === 0 ? (
          <div>
            <EmptyState
              icon={Calendar}
              title="אין לך תורים שמורים"
              description="ההזמנות שתבצע במכשיר זה יופיעו כאן אוטומטית"
            />
            <div className="text-center mt-4">
              <Button asChild variant="gold" size="lg">
                <Link href="/book"><Plus className="w-4 h-4 ms-2" /> קבע תור עכשיו</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-primary" />
                  הבאים בתור ({upcoming.length})
                </h2>
                <div className="space-y-3">
                  {upcoming.map((b, i) => (
                    <BookingCard key={b.id} b={b} index={i} onForget={forgetCode} />
                  ))}
                </div>
              </section>
            )}

            {/* Past */}
            {past.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-muted-foreground">
                  <span className="w-1 h-5 rounded-full bg-muted-foreground/40" />
                  היסטוריה ({past.length})
                </h2>
                <div className="space-y-3 opacity-80">
                  {past.map((b, i) => (
                    <BookingCard key={b.id} b={b} index={i} onForget={forgetCode} compact />
                  ))}
                </div>
              </section>
            )}

            <div className="text-center mt-10">
              <Button asChild variant="gold" size="lg">
                <Link href="/book"><Plus className="w-4 h-4 ms-2" /> קבע תור נוסף</Link>
              </Button>
            </div>
          </>
        )}

        <div className="text-center mt-12">
          <Button asChild variant="ghost">
            <Link href="/"><ArrowRight className="w-4 h-4 ms-2" /> חזרה לדף הבית</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ b, index, onForget, compact }: { b: MyBooking; index: number; onForget: (c: string) => void; compact?: boolean }) {
  const meta = STATUS_META[b.status];
  const Icon = meta.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: b.serviceColor + '20', color: b.serviceColor }}
          >
            <Scissors className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-bold truncate">{b.serviceName}</h3>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0', meta.bg, meta.text)}>
                <Icon className="w-3 h-3" />
                {meta.label}
              </span>
            </div>
            <div className="text-sm text-muted-foreground space-y-0.5">
              <div className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                {b.employeeName}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDateHe(b.startAt)}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(b.startAt)} — {formatTime(b.endAt)}
              </div>
            </div>
            {!compact && (
              <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground font-mono">{b.confirmationCode}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-primary">{formatAgorot(b.priceAgorot)}</span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/booking/${b.confirmationCode}`}>פרטים</Link>
                  </Button>
                </div>
              </div>
            )}
            {compact && (b.status === 'CANCELLED' || b.status === 'COMPLETED') && (
              <button
                onClick={() => onForget(b.confirmationCode)}
                className="text-xs text-muted-foreground hover:text-destructive mt-2"
              >
                הסר מההיסטוריה
              </button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
