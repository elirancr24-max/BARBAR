'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Calendar, AlertCircle, Trash2, Globe } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { cn, formatDateHe } from '@/lib/utils';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface TimeOff {
  id: string;
  employeeId: string | null;
  startDate: string;
  endDate: string;
  reason: string | null;
  isGlobal: boolean;
}

interface Employee { id: string; user: { fullName: string }; }

interface Props {
  scope: 'admin' | 'self';
}

function isoNow(): string {
  return new Date().toISOString().slice(0, 16);
}

export function TimeOffManager({ scope }: Props) {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const confirm = useConfirm();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    employeeId: user?.employee?.id || '',
    startDate: isoNow(),
    endDate: isoNow(),
    reason: '',
    isGlobal: false,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await api.get<Employee[]>('/employees')).data,
    enabled: scope === 'admin',
  });

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['time-off', scope, user?.employee?.id],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (scope === 'self' && user?.employee?.id) params.employeeId = user.employee.id;
      const { data } = await api.get<TimeOff[]>('/time-off', { params });
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async () => (await api.post('/time-off', {
      employeeId: form.isGlobal ? null : form.employeeId,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      reason: form.reason || undefined,
      isGlobal: form.isGlobal,
    })).data,
    onSuccess: () => {
      toast.success('החסימה נשמרה');
      setShowAdd(false);
      setForm({
        employeeId: user?.employee?.id || '',
        startDate: isoNow(),
        endDate: isoNow(),
        reason: '',
        isGlobal: false,
      });
      qc.invalidateQueries({ queryKey: ['time-off'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה');
    },
  });

  const importHolidaysMut = useMutation({
    mutationFn: async () => (await api.post<{ imported: number; skipped: number }>('/time-off/import-holidays')).data,
    onSuccess: (data) => {
      toast.success(`יובאו ${data.imported} חגים (${data.skipped} כבר קיימים)`);
      qc.invalidateQueries({ queryKey: ['time-off'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה בייבוא');
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/time-off/${id}`)).data,
    onSuccess: () => {
      toast.success('בוטל');
      qc.invalidateQueries({ queryKey: ['time-off'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
  });

  function quickBlock(days: number) {
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(end.getDate() + days);
    setForm((f) => ({
      ...f,
      startDate: start.toISOString().slice(0, 16),
      endDate: end.toISOString().slice(0, 16),
    }));
    setShowAdd(true);
  }

  function blockToday() {
    const d = new Date(); d.setHours(0,0,0,0);
    const e = new Date(d); e.setHours(23, 59, 59, 0);
    setForm((f) => ({
      ...f,
      startDate: d.toISOString().slice(0, 16),
      endDate: e.toISOString().slice(0, 16),
      reason: 'יום חופש',
    }));
    setShowAdd(true);
  }

  function quickHoursBlock(hours: number) {
    const start = new Date();
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    const fmt = (d: Date) => {
      const z = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
      return z.toISOString().slice(0, 16);
    };
    setForm((f) => ({
      ...f,
      startDate: fmt(start),
      endDate: fmt(end),
      reason: hours === 1 ? 'הפסקה' : `הפסקה ${hours} שעות`,
    }));
    setShowAdd(true);
  }

  const sortedList = [...list].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const upcoming = sortedList.filter((t) => new Date(t.endDate) >= new Date());
  const past = sortedList.filter((t) => new Date(t.endDate) < new Date());

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display font-bold text-lg">חסימות זמנים</h2>
            <p className="text-sm text-muted-foreground">חופשות · ימי מחלה · הפסקות ארוכות</p>
          </div>
          <Button variant="gold" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 ms-1" /> חסום זמן
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => quickHoursBlock(1)}>
            ⏸️ הפסקה שעה
          </Button>
          <Button variant="outline" size="sm" onClick={() => quickHoursBlock(2)}>
            ⏸️ הפסקה שעתיים
          </Button>
          <Button variant="outline" size="sm" onClick={blockToday}>
            <Calendar className="w-3.5 h-3.5 ms-1" /> חסום את היום
          </Button>
          <Button variant="outline" size="sm" onClick={() => quickBlock(7)}>
            <Calendar className="w-3.5 h-3.5 ms-1" /> שבוע חופש
          </Button>
          <Button variant="outline" size="sm" onClick={() => quickBlock(14)}>
            <Calendar className="w-3.5 h-3.5 ms-1" /> שבועיים
          </Button>
          {scope === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              disabled={importHolidaysMut.isPending}
              onClick={async () => {
                const ok = await confirm({
                  title: 'ייבוא חגי ישראל',
                  description: 'לייבא את כל חגי ישראל לתאריכים הגלובליים?',
                  confirmText: 'כן, ייבא',
                });
                if (ok) importHolidaysMut.mutate();
              }}
            >
              <Globe className="w-3.5 h-3.5 ms-1" /> ייבוא חגי ישראל
            </Button>
          )}
        </div>
      </Card>

      {/* Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-5 border-primary/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><AlertCircle className="w-4 h-4 text-primary" /> חסימת זמן חדשה</h3>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground" aria-label="סגור">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {scope === 'admin' && (
                  <div className="space-y-2">
                    <Label className="text-xs">למי?</Label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setForm({ ...form, isGlobal: true })}
                        className={cn('h-10 px-3 rounded-md border-2 text-sm font-medium flex items-center gap-2', form.isGlobal ? 'border-primary bg-primary/10 text-primary' : 'border-input')}
                      >
                        <Globe className="w-4 h-4" /> כל המספרה (חג / סגירה)
                      </button>
                      {employees.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setForm({ ...form, isGlobal: false, employeeId: e.id })}
                          className={cn('h-10 px-3 rounded-md border-2 text-sm font-medium', !form.isGlobal && form.employeeId === e.id ? 'border-primary bg-primary/10 text-primary' : 'border-input')}
                        >
                          {e.user.fullName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">התחלה</Label>
                    <Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">סיום</Label>
                    <Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">סיבה (לא חובה)</Label>
                  <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="חופשה, חתונה, מילואים..." />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" onClick={() => setShowAdd(false)}>ביטול</Button>
                  <Button variant="gold" disabled={createMut.isPending} onClick={() => createMut.mutate()}>
                    {createMut.isPending ? 'שומר...' : 'שמור חסימה'}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">קרובים ({upcoming.length})</h3>
        {isLoading ? null : upcoming.length === 0 ? (
          <EmptyState icon={Calendar} title="אין חסימות עתידיות" description="לחץ ׳חסום זמן׳ כדי להוסיף" />
        ) : (
          <div className="space-y-2">
            {upcoming.map((t) => (
              <Card key={t.id} className="p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', t.isGlobal ? 'bg-rose-500/15 text-rose-500' : 'bg-primary/15 text-primary')}>
                    {t.isGlobal ? <Globe className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {t.isGlobal && <span className="text-xs bg-rose-500/15 text-rose-600 px-1.5 py-0.5 rounded">המספרה סגורה</span>}
                      {t.reason || 'חסימה'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatDateHe(t.startDate)} ← {formatDateHe(t.endDate)}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" aria-label="הסר חסימה" onClick={async () => {
                  const ok = await confirm({ title: 'להסיר חסימה?', description: 'הזמנים יחזרו להיות פנויים להזמנה.', confirmText: 'כן, הסר', variant: 'destructive' });
                  if (ok) deleteMut.mutate(t.id);
                }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">היסטוריה</h3>
          <div className="space-y-2 opacity-60">
            {past.slice(0, 5).map((t) => (
              <Card key={t.id} className="p-3 text-sm flex items-center justify-between">
                <div className="truncate">
                  <span className="text-muted-foreground">{formatDateHe(t.startDate)}</span>
                  {t.reason && <span className="ms-2">· {t.reason}</span>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
