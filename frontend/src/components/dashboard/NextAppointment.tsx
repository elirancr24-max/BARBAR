'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, Scissors, Clock, User as UserIcon, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn, formatTime } from '@/lib/utils';

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  service: { name: string; durationMin: number; color: string };
  employee: { id: string; color: string; user: { fullName: string } };
  customer: { id: string; fullName: string; phone: string };
}

function countdownText(ms: number): string {
  if (ms <= 0) return 'עכשיו';
  const min = Math.round(ms / 60_000);
  if (min < 60) return `בעוד ${min} דק'`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem ? `בעוד ${h}:${String(rem).padStart(2, '0')} שעות` : `בעוד ${h} שעות`;
}

export function NextAppointment() {
  const startOfDay = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const endOfDay = useMemo(() => new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000), [startOfDay]);

  const { data: appts = [] } = useQuery({
    queryKey: ['appointments', 'today-next'],
    queryFn: async () => {
      const { data } = await api.get<Appointment[]>('/appointments', {
        params: { from: startOfDay.toISOString(), to: endOfDay.toISOString() },
      });
      return data;
    },
    refetchInterval: 30_000,
  });

  const next = useMemo(() => {
    const now = Date.now();
    return appts
      .filter((a) => a.status !== 'CANCELLED' && new Date(a.endAt).getTime() > now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
  }, [appts]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!next) return null;

  const startMs = new Date(next.startAt).getTime();
  const diff = startMs - now;
  const inProgress = diff <= 0;
  const customerPath = `/admin/customers/${next.customer.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className={cn('p-5 text-white relative overflow-hidden', inProgress ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'gold-gradient')}>
          {/* Decorative circle */}
          <div className="absolute -end-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-widest opacity-90 mb-1">
                {inProgress ? '🔴 תור פעיל כעת' : '⏰ התור הבא'}
              </div>
              <h2 className="font-display text-2xl lg:text-3xl font-bold leading-tight truncate">
                {next.customer.fullName}
              </h2>
              <div className="text-sm opacity-95 mt-1 flex items-center gap-2 flex-wrap">
                <Scissors className="w-3.5 h-3.5" /> {next.service.name}
                <span className="opacity-75">·</span>
                <UserIcon className="w-3.5 h-3.5" /> {next.employee.user.fullName}
              </div>
            </div>
            <div className="text-end">
              <div className="font-display text-3xl lg:text-4xl font-black tabular-nums leading-none">
                {formatTime(next.startAt)}
              </div>
              <div className="text-xs opacity-90 mt-1">
                {inProgress
                  ? `עד ${formatTime(next.endAt)}`
                  : countdownText(diff)}
              </div>
            </div>
          </div>

          {/* Action strip */}
          <div className="relative flex gap-2 mt-4 pt-4 border-t border-white/20">
            <a
              href={`tel:${next.customer.phone}`}
              className="flex-1 h-10 rounded-md bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center gap-1.5 text-sm font-medium transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> חייג
            </a>
            <a
              href={`https://wa.me/${next.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent('היי! אני מחכה לך')}`}
              target="_blank" rel="noopener"
              className="flex-1 h-10 rounded-md bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center gap-1.5 text-sm font-medium transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <Button asChild variant="secondary" size="sm" className="h-10">
              <Link href={customerPath}>פרופיל</Link>
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
