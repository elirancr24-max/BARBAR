'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Clock, Coffee, Save, Power, Copy, Check } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils';

const days = [
  { dow: 0, label: 'ראשון', short: 'א׳' },
  { dow: 1, label: 'שני', short: 'ב׳' },
  { dow: 2, label: 'שלישי', short: 'ג׳' },
  { dow: 3, label: 'רביעי', short: 'ד׳' },
  { dow: 4, label: 'חמישי', short: 'ה׳' },
  { dow: 5, label: 'שישי', short: 'ו׳' },
  { dow: 6, label: 'שבת', short: 'ש׳' },
];

interface Hour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
}

interface DayState {
  enabled: boolean;
  startTime: string;
  endTime: string;
  hasBreak: boolean;
  breakStart: string;
  breakEnd: string;
}

const DEFAULT_DAY: DayState = {
  enabled: false,
  startTime: '10:00',
  endTime: '20:00',
  hasBreak: false,
  breakStart: '13:00',
  breakEnd: '14:00',
};

export default function AvailabilityPage() {
  const user = useAuth((s) => s.user);
  const employeeId = user?.employee?.id;
  const qc = useQueryClient();
  const [state, setState] = useState<Record<number, DayState>>({});
  const [dirty, setDirty] = useState(false);

  const { data: hoursFromServer, isLoading } = useQuery({
    queryKey: ['working-hours', employeeId],
    enabled: !!employeeId,
    queryFn: async () => (await api.get<Hour[]>('/working-hours', { params: { employeeId } })).data,
  });

  useEffect(() => {
    if (!hoursFromServer) return;
    const map: Record<number, DayState> = {};
    days.forEach(({ dow }) => { map[dow] = { ...DEFAULT_DAY }; });
    for (const h of hoursFromServer) {
      map[h.dayOfWeek] = {
        enabled: true,
        startTime: h.startTime,
        endTime: h.endTime,
        hasBreak: !!(h.breakStart && h.breakEnd),
        breakStart: h.breakStart || '13:00',
        breakEnd: h.breakEnd || '14:00',
      };
    }
    setState(map);
    setDirty(false);
  }, [hoursFromServer]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const hours = Object.entries(state)
        .filter(([, s]) => s.enabled)
        .map(([dow, s]) => ({
          dayOfWeek: Number(dow),
          startTime: s.startTime,
          endTime: s.endTime,
          breakStart: s.hasBreak ? s.breakStart : null,
          breakEnd: s.hasBreak ? s.breakEnd : null,
        }));
      return (await api.put(`/working-hours/${employeeId}`, { hours })).data;
    },
    onSuccess: () => {
      toast.success('✓ השעות נשמרו');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['working-hours'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה');
    },
  });

  function update(dow: number, patch: Partial<DayState>) {
    setState((s) => ({ ...s, [dow]: { ...s[dow], ...patch } }));
    setDirty(true);
  }

  // Copy day's hours to all enabled days
  function copyToAll(sourceDow: number) {
    const src = state[sourceDow];
    if (!src) return;
    setState((s) => {
      const next = { ...s };
      days.forEach(({ dow }) => {
        if (dow !== sourceDow && next[dow]?.enabled) {
          next[dow] = { ...next[dow], ...src, enabled: true };
        }
      });
      return next;
    });
    setDirty(true);
    toast.success('הועתק לכל הימים הפעילים');
  }

  return (
    <>
      <TopBar title="שעות זמינות" subtitle="הגדר את ימי ושעות העבודה שלך + הפסקות" />
      <div className="p-4 lg:p-6 page-enter max-w-3xl pb-24 lg:pb-6 space-y-3">
        {/* Info banner */}
        <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 text-sm text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <span>הפעל ימים שאתה עובד, הגדר שעות וגם הפסקת אמצע יום אם צריך.</span>
        </div>

        {/* Days */}
        {isLoading ? (
          <div className="space-y-3">
            {days.map(({ dow }) => <Card key={dow} className="h-24 animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {days.map(({ dow, label, short }, i) => {
              const d = state[dow];
              if (!d) return null;
              return (
                <motion.div
                  key={dow}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card className={cn('overflow-hidden transition-colors', d.enabled ? 'border-primary/40' : 'opacity-60')}>
                    {/* Header row */}
                    <div className="flex items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors',
                          d.enabled ? 'gold-gradient text-white' : 'bg-secondary text-muted-foreground',
                        )}>
                          {short}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold">{label}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.enabled
                              ? `${d.startTime}–${d.endTime}${d.hasBreak ? ` · הפסקה ${d.breakStart}–${d.breakEnd}` : ''}`
                              : 'יום מנוחה'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => update(dow, { enabled: !d.enabled })}
                        className={cn(
                          'relative w-12 h-7 rounded-full transition-colors shrink-0',
                          d.enabled ? 'bg-primary' : 'bg-muted',
                        )}
                        aria-label={d.enabled ? 'הפעל יום' : 'בטל יום'}
                        role="switch"
                        aria-checked={d.enabled}
                      >
                        <span className={cn(
                          'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform',
                          d.enabled ? 'translate-x-[-22px] rtl:translate-x-[22px]' : 'translate-x-0.5',
                        )} />
                      </button>
                    </div>

                    {/* Expanded — hours + break */}
                    {d.enabled && (
                      <div className="border-t bg-secondary/30 p-4 space-y-3">
                        {/* Working hours */}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> שעות עבודה
                          </label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={d.startTime}
                              onChange={(e) => update(dow, { startTime: e.target.value })}
                              className="text-base tabular-nums"
                            />
                            <span className="text-muted-foreground">—</span>
                            <Input
                              type="time"
                              value={d.endTime}
                              onChange={(e) => update(dow, { endTime: e.target.value })}
                              className="text-base tabular-nums"
                            />
                          </div>
                        </div>

                        {/* Break toggle */}
                        <button
                          onClick={() => update(dow, { hasBreak: !d.hasBreak })}
                          className={cn(
                            'w-full flex items-center justify-between p-2.5 rounded-lg border-2 transition-colors text-sm font-medium',
                            d.hasBreak ? 'border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-input bg-background hover:border-amber-400/50',
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Coffee className="w-4 h-4" />
                            הפסקת אמצע יום
                          </span>
                          {d.hasBreak ? <Check className="w-4 h-4" /> : <span className="text-xs text-muted-foreground">לחץ להוספה</span>}
                        </button>

                        {d.hasBreak && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                              שעות הפסקה
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={d.breakStart}
                                onChange={(e) => update(dow, { breakStart: e.target.value })}
                                className="text-base tabular-nums"
                              />
                              <span className="text-muted-foreground">—</span>
                              <Input
                                type="time"
                                value={d.breakEnd}
                                onChange={(e) => update(dow, { breakEnd: e.target.value })}
                                className="text-base tabular-nums"
                              />
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => copyToAll(dow)}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> העתק שעות אלו לכל הימים הפעילים
                        </button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      {dirty && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="fixed bottom-0 inset-x-0 lg:end-0 lg:start-64 z-30 bg-card/95 backdrop-blur-md border-t p-3 lg:p-4"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
        >
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-amber-500 font-medium">●</span> שינויים לא נשמרו
            </div>
            <Button variant="gold" size="lg" onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="px-8 h-12">
              <Save className="w-5 h-5 ms-2" />
              {saveMut.isPending ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </div>
        </motion.div>
      )}
    </>
  );
}
