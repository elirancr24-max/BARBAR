'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, CalendarDays, Phone, Clock, Scissors, User as UserIcon, X, MessageCircle, CheckCircle2, ListFilter, LayoutGrid, List, Plus, Pencil, UserX, RotateCcw, DollarSign, Hand } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api';
import { cn, formatAgorot, formatTime } from '@/lib/utils';
import { NewAppointmentDialog } from './NewAppointmentDialog';
import { PaymentDialog } from './PaymentDialog';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string | null;
  priceAgorot: number;
  checkedInAt?: string | null;
  payment?: { status: string; method?: string | null } | null;
  service: { name: string; color: string; durationMin: number };
  employee: { id: string; color: string; user: { fullName: string } };
  customer: { fullName: string; phone: string };
}

const statusStyles: Record<string, { bg: string; ring: string; label: string; text: string }> = {
  PENDING:   { bg: 'bg-slate-100 dark:bg-slate-800/60', ring: 'border-slate-300 dark:border-slate-600', text: 'text-slate-700 dark:text-slate-200', label: 'ממתין' },
  CONFIRMED: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', ring: 'border-emerald-400 dark:border-emerald-700', text: 'text-emerald-800 dark:text-emerald-200', label: 'אושר' },
  COMPLETED: { bg: 'bg-blue-50 dark:bg-blue-950/40', ring: 'border-blue-400 dark:border-blue-700', text: 'text-blue-800 dark:text-blue-200', label: 'הושלם' },
  CANCELLED: { bg: 'bg-rose-50 dark:bg-rose-950/40', ring: 'border-rose-300 dark:border-rose-700', text: 'text-rose-800 dark:text-rose-200', label: 'בוטל' },
  NO_SHOW:   { bg: 'bg-amber-50 dark:bg-amber-950/40', ring: 'border-amber-400 dark:border-amber-700', text: 'text-amber-800 dark:text-amber-200', label: 'לא הגיע' },
};

const HOUR_START = 8;
const HOUR_END = 21;
const HOUR_HEIGHT = 70; // px per hour (slightly smaller for mobile)

interface Props {
  editable?: boolean;
  employeeIdFilter?: string;
}

type ViewMode = 'timeline' | 'list';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export function DayCalendar({ editable = true, employeeIdFilter }: Props) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [date, setDate] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  // Default to list view on mobile (better UX on narrow screens)
  const initialView: ViewMode = typeof window !== 'undefined' && window.innerWidth < 1024 ? 'list' : 'timeline';
  const [view, setView] = useState<ViewMode>(initialView);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const nowRef = useRef<HTMLDivElement>(null);

  const startOf = useMemo(() => { const d = new Date(date); d.setHours(0,0,0,0); return d; }, [date]);
  const endOf = useMemo(() => new Date(startOf.getTime() + 24 * 60 * 60 * 1000), [startOf]);

  const { data: appts = [], isLoading } = useQuery({
    queryKey: ['appointments', 'day', startOf.toISOString(), employeeIdFilter],
    queryFn: async () => {
      const { data } = await api.get<Appointment[]>('/appointments', {
        params: {
          from: startOf.toISOString(),
          to: endOf.toISOString(),
          ...(employeeIdFilter && { employeeId: employeeIdFilter }),
        },
      });
      return data.filter((a) => a.status !== 'CANCELLED');
    },
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: string; status?: string; notes?: string; startAt?: string }) =>
      (await api.patch(`/appointments/${input.id}`, input)).data,
    onSuccess: (data) => {
      toast.success('עודכן');
      qc.invalidateQueries({ queryKey: ['appointments'] });
      if (selected && selected.id === data.id) {
        setSelected({ ...selected, ...data });
      }
      setEditingNotes(false);
      if (data?.whatsapp?.url) window.open(data.whatsapp.url, '_blank');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/appointments/${id}`)).data,
    onSuccess: (data) => {
      toast.success('התור בוטל');
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['appointments'] });
      if (data?.whatsapp?.url) window.open(data.whatsapp.url, '_blank');
    },
  });

  const whatsappMutation = useMutation({
    mutationFn: async (id: string) => (await api.post<{ url: string }>(`/appointments/${id}/whatsapp?kind=confirm`)).data,
    onSuccess: (data) => { window.open(data.url, '_blank'); },
  });

  const checkInMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/appointments/${id}/check-in`)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      if (selected && selected.id === data.id) setSelected({ ...selected, ...data });
      toast.success(data.checkedInAt ? '✅ הלקוח סומן כהגיע' : 'בוטל סימון');
    },
  });

  const rebookMutation = useMutation({
    mutationFn: async (apt: Appointment) => {
      const next = new Date(apt.startAt);
      next.setDate(next.getDate() + 28);
      const { data } = await api.post(`/appointments/${apt.id}/clone`, { startAt: next.toISOString() });
      return data;
    },
    onSuccess: () => {
      toast.success('🎉 תור חוזר נקבע בעוד 4 שבועות');
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה');
    },
  });

  const isToday = isSameDay(date, new Date());
  const now = new Date();
  const nowOffset = isToday
    ? ((now.getHours() - HOUR_START) * 60 + now.getMinutes()) * (HOUR_HEIGHT / 60)
    : null;

  // Auto-scroll to now on mount
  useEffect(() => {
    if (isToday && view === 'timeline' && nowRef.current) {
      nowRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [isToday, view]);

  function shiftDay(delta: number) {
    setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + delta); return n; });
  }

  function setToday() {
    const d = new Date(); d.setHours(0,0,0,0); setDate(d);
  }

  return (
    <div className="space-y-4">
      {/* TOOLBAR — mobile: stacked, desktop: row */}
      <Card className="p-3 lg:p-5">
        {/* Row 1 — date nav (always centered, big on mobile) */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)} aria-label="יום קודם" className="shrink-0 h-11 w-11">
            <ChevronRight className="w-5 h-5" />
          </Button>
          <div className="text-center flex-1 min-w-0">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {isToday ? 'היום' : ''}
            </div>
            <div className="font-display font-bold text-base sm:text-lg lg:text-xl leading-tight truncate">
              {formatDayHeader(date)}
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => shiftDay(1)} aria-label="יום הבא" className="shrink-0 h-11 w-11">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Row 2 — actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant={isToday ? 'gold' : 'outline'} size="sm" onClick={setToday} className="h-10">
            <CalendarDays className="w-4 h-4 ms-1" />
            היום
          </Button>
          <div className="flex-1 min-w-[140px] max-w-[200px]">
            <DatePicker
              value={date.toISOString().slice(0, 10)}
              onChange={(iso) => setDate(new Date(iso))}
            />
          </div>
          <div className="flex border rounded-md overflow-hidden h-10">
            <button
              onClick={() => setView('timeline')}
              aria-label="תצוגת ציר זמן"
              className={cn('px-3 text-sm flex items-center gap-1 transition-colors', view === 'timeline' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">ציר זמן</span>
            </button>
            <button
              onClick={() => setView('list')}
              aria-label="תצוגת רשימה"
              className={cn('px-3 text-sm flex items-center gap-1 transition-colors', view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">רשימה</span>
            </button>
          </div>
        </div>

        {/* Status filter chips — horizontally scrollable on mobile */}
        <div className="flex gap-1.5 mt-3 pt-3 border-t overflow-x-auto -mx-3 px-3 lg:mx-0 lg:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip active={!statusFilter} onClick={() => setStatusFilter(null)}>
            הכל ({appts.length})
          </FilterChip>
          {['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'].map((s) => {
            const count = appts.filter(a => a.status === s).length;
            return (
              <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? null : s)}>
                {statusStyles[s].label} ({count})
              </FilterChip>
            );
          })}
        </div>

        {/* Stats strip — desktop only */}
        <div className="hidden sm:flex flex-wrap gap-4 mt-3 pt-3 border-t text-sm">
          <Stat label="סה״כ תורים" value={appts.length} />
          <Stat label="אושרו" value={appts.filter(a => a.status === 'CONFIRMED').length} />
          <Stat label="ממתינים" value={appts.filter(a => a.status === 'PENDING').length} />
          <Stat label="הושלמו" value={appts.filter(a => a.status === 'COMPLETED').length} />
          <Stat label="הכנסה צפויה" value={formatAgorot(appts.filter(a => a.status !== 'CANCELLED').reduce((s, a) => s + a.priceAgorot, 0))} />
        </div>

        {/* Mobile revenue strip */}
        <div className="sm:hidden mt-3 pt-3 border-t text-sm flex justify-between items-center">
          <span className="text-muted-foreground">הכנסה צפויה</span>
          <span className="font-bold text-primary text-base tabular-nums">{formatAgorot(appts.filter(a => a.status !== 'CANCELLED').reduce((s, a) => s + a.priceAgorot, 0))}</span>
        </div>
      </Card>

      {/* CONTENT */}
      {isLoading ? (
        <Skeleton className="h-[600px] w-full rounded-xl" />
      ) : view === 'timeline' ? (
        <TimelineView appts={statusFilter ? appts.filter(a => a.status === statusFilter) : appts} hourStart={HOUR_START} hourEnd={HOUR_END} hourHeight={HOUR_HEIGHT} nowOffset={nowOffset} nowRef={nowRef} onClick={setSelected} />
      ) : (
        <ListView appts={statusFilter ? appts.filter(a => a.status === statusFilter) : appts} onClick={setSelected} />
      )}

      {/* FAB — Add new appointment */}
      {editable && (
        <button
          onClick={() => setShowAdd(true)}
          aria-label="הוסף תור חדש"
          className="fixed bottom-20 lg:bottom-6 end-4 lg:end-8 z-40 w-14 h-14 rounded-full gold-gradient text-white shadow-2xl shadow-primary/40 hover:shadow-primary/60 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          style={{ bottom: 'max(env(safe-area-inset-bottom), 80px)' }}
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      <NewAppointmentDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        defaultDate={date}
        forcedEmployeeId={employeeIdFilter}
      />

      {selected && (
        <PaymentDialog
          open={showPayment}
          onClose={() => setShowPayment(false)}
          appointmentId={selected.id}
          defaultAmountAgorot={selected.priceAgorot}
          customerName={selected.customer.fullName}
        />
      )}

      {/* DETAIL DRAWER */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="w-full sm:max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="overflow-hidden rounded-t-2xl sm:rounded-2xl">
                <div className="p-6 pb-4 relative border-b" style={{ background: `linear-gradient(135deg, ${selected.employee.color}15, transparent)` }}>
                  <button className="absolute start-4 top-4 text-muted-foreground hover:text-foreground" onClick={() => setSelected(null)} aria-label="סגור">
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', statusStyles[selected.status].bg, statusStyles[selected.status].ring, statusStyles[selected.status].text)}>
                      {statusStyles[selected.status].label}
                    </span>
                    <div className="text-xs text-muted-foreground font-mono">#{selected.id.slice(-6).toUpperCase()}</div>
                  </div>
                  <h3 className="font-display text-2xl font-bold">{selected.customer.fullName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{formatDayHeader(new Date(selected.startAt))} · {formatTime(selected.startAt)}–{formatTime(selected.endAt)}</p>
                </div>

                <div className="p-5 space-y-3">
                  <DetailRow icon={Scissors} label="שירות" value={selected.service.name} />
                  <DetailRow icon={UserIcon} label="ספר" value={selected.employee.user.fullName} accent={selected.employee.color} />
                  <DetailRow icon={Clock} label="משך" value={`${selected.service.durationMin} דקות`} />
                  <DetailRow icon={Phone} label="טלפון" value={selected.customer.phone} link={`tel:${selected.customer.phone}`} />
                  <div className="flex items-center justify-between py-2 border-t mt-3">
                    <span className="text-muted-foreground text-sm">מחיר</span>
                    <span className="text-2xl font-bold text-primary font-display">{formatAgorot(selected.priceAgorot)}</span>
                  </div>
                  {editable ? (
                    <div className="mt-2">
                      {editingNotes ? (
                        <div className="space-y-2">
                          <Input
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            placeholder="הוסף הערה..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="gold" onClick={() => updateMutation.mutate({ id: selected.id, notes: notesDraft })}>שמור</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>ביטול</Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setNotesDraft(selected.notes || ''); setEditingNotes(true); }}
                          className="w-full text-start text-sm bg-secondary/50 hover:bg-secondary rounded-lg p-3 border-s-4 border-primary flex items-start gap-2 group transition-colors"
                        >
                          <span className="flex-1">
                            {selected.notes ? `📝 ${selected.notes}` : <span className="text-muted-foreground">+ הוסף הערה</span>}
                          </span>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary mt-0.5 shrink-0" />
                        </button>
                      )}
                    </div>
                  ) : (
                    selected.notes && <div className="text-sm bg-secondary/50 rounded-lg p-3 mt-2 border-s-4 border-primary">📝 {selected.notes}</div>
                  )}
                </div>

                {editable && (
                  <div className="p-4 border-t bg-secondary/30 space-y-2">
                    {/* Check-in + Payment row (primary actions) */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={selected.checkedInAt ? 'default' : 'outline'}
                        onClick={() => checkInMutation.mutate(selected.id)}
                        disabled={checkInMutation.isPending}
                        className={selected.checkedInAt ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                      >
                        <Hand className="w-4 h-4 ms-1" />
                        {selected.checkedInAt ? '✓ הגיע' : 'סמן הגעה'}
                      </Button>
                      {selected.payment?.status === 'PAID' ? (
                        <Button variant="outline" disabled>
                          <DollarSign className="w-4 h-4 ms-1 text-emerald-500" /> שולם
                        </Button>
                      ) : (
                        <Button variant="gold" onClick={() => setShowPayment(true)}>
                          <DollarSign className="w-4 h-4 ms-1" /> רשום תשלום
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => whatsappMutation.mutate(selected.id)}>
                        <MessageCircle className="w-4 h-4 ms-1" /> WhatsApp
                      </Button>
                      <Button
                        variant={selected.status === 'CONFIRMED' ? 'default' : 'outline'}
                        onClick={() => updateMutation.mutate({
                          id: selected.id,
                          status: selected.status === 'CONFIRMED' ? 'COMPLETED' : 'CONFIRMED',
                        })}
                      >
                        <CheckCircle2 className="w-4 h-4 ms-1" />
                        {selected.status === 'CONFIRMED' ? 'סמן הושלם' : 'אשר תור'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => updateMutation.mutate({ id: selected.id, status: 'NO_SHOW' })}>
                        <UserX className="w-4 h-4 ms-1" /> לא הגיע
                      </Button>
                      <Button variant="outline" onClick={() => rebookMutation.mutate(selected)} disabled={rebookMutation.isPending}>
                        <RotateCcw className="w-4 h-4 ms-1" /> תור חוזר 4 שבועות
                      </Button>
                      {selected.status !== 'CANCELLED' && (
                        <Button variant="destructive" className="col-span-2" onClick={async () => {
                          const ok = await confirm({ title: 'לבטל את התור?', description: 'הלקוח לא יקבל הודעה אוטומטית.', confirmText: 'כן, בטל תור', variant: 'destructive' });
                          if (ok) cancelMutation.mutate(selected.id);
                        }}>
                          <X className="w-4 h-4 ms-1" /> בטל תור
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold text-base">{value}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 px-3 h-8 rounded-full text-xs font-medium border-2 transition-all whitespace-nowrap',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background border-input text-muted-foreground hover:border-primary/60',
      )}
    >
      {children}
    </button>
  );
}

function DetailRow({ icon: Icon, label, value, link, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; link?: string; accent?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={accent ? { background: accent + '20', color: accent } : undefined}>
        <Icon className={cn('w-4 h-4', !accent && 'text-muted-foreground')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        {link ? <a href={link} className="font-medium hover:text-primary">{value}</a> : <div className="font-medium truncate">{value}</div>}
      </div>
    </div>
  );
}

// ─────────────── Timeline view ───────────────

function TimelineView({
  appts, hourStart, hourEnd, hourHeight, nowOffset, nowRef, onClick,
}: {
  appts: Appointment[];
  hourStart: number; hourEnd: number; hourHeight: number;
  nowOffset: number | null;
  nowRef: React.RefObject<HTMLDivElement | null>;
  onClick: (a: Appointment) => void;
}) {
  const totalHours = hourEnd - hourStart;
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => hourStart + i);

  if (!appts.length) {
    return (
      <EmptyState icon={CalendarDays} title="אין תורים ביום זה" description="היום פנוי. מעולה לקפה ארוך." />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div className="flex" style={{ height: totalHours * hourHeight + 'px' }}>
          {/* Hours column */}
          <div className="w-20 shrink-0 border-e bg-secondary/30 relative">
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute end-2 -translate-y-2 text-xs text-muted-foreground font-mono tabular-nums font-medium"
                style={{ top: i * hourHeight + 'px' }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {/* Events area */}
          <div className="flex-1 relative">
            {/* Hour lines */}
            {hours.slice(0, -1).map((h, i) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-dashed border-border/50"
                style={{ top: (i + 1) * hourHeight + 'px' }}
              />
            ))}
            {/* Half-hour lines */}
            {hours.slice(0, -1).map((h, i) => (
              <div
                key={`half-${h}`}
                className="absolute inset-x-0 border-t border-dotted border-border/20"
                style={{ top: i * hourHeight + hourHeight / 2 + 'px' }}
              />
            ))}

            {/* NOW indicator */}
            {nowOffset !== null && nowOffset >= 0 && nowOffset <= totalHours * hourHeight && (
              <div
                ref={nowRef}
                className="absolute inset-x-0 z-20 flex items-center pointer-events-none"
                style={{ top: nowOffset + 'px' }}
              >
                <span className="w-3 h-3 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.2)] animate-pulse -ms-1.5" />
                <div className="flex-1 h-0.5 bg-primary" />
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">עכשיו</span>
              </div>
            )}

            {/* Events */}
            {appts.map((a) => {
              const start = new Date(a.startAt);
              const end = new Date(a.endAt);
              const top = ((start.getHours() - hourStart) * 60 + start.getMinutes()) * (hourHeight / 60);
              const height = Math.max(36, ((end.getTime() - start.getTime()) / 60_000) * (hourHeight / 60));
              const s = statusStyles[a.status];
              return (
                <motion.button
                  key={a.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => onClick(a)}
                  className={cn(
                    'absolute inset-x-2 rounded-xl border-2 text-start ps-3 pe-2 py-2 overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl hover:z-10 active:scale-100',
                    s.bg, s.ring,
                  )}
                  style={{ top: top + 'px', height: height + 'px', borderInlineStartWidth: '6px', borderInlineStartColor: a.employee.color }}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={cn('font-bold text-sm tabular-nums flex items-center gap-1', s.text)}>
                      {a.checkedInAt && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)] animate-pulse" title="הלקוח הגיע" />}
                      {formatTime(a.startAt)}–{formatTime(a.endAt)}
                    </span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium border', s.ring, s.text)}>
                      {s.label}
                    </span>
                  </div>
                  <div className={cn('font-semibold truncate', s.text)}>{a.customer.fullName}</div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Scissors className="w-3 h-3 inline" /> {a.service.name}
                    <span className="opacity-50">·</span>
                    <span style={{ color: a.employee.color }}>{a.employee.user.fullName}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─────────────── List view ───────────────

function ListView({ appts, onClick }: { appts: Appointment[]; onClick: (a: Appointment) => void }) {
  if (!appts.length) {
    return <EmptyState icon={CalendarDays} title="אין תורים ביום זה" description="היום פנוי. מעולה לקפה ארוך." />;
  }
  const sorted = [...appts].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return (
    <div className="space-y-2">
      {sorted.map((a, i) => {
        const s = statusStyles[a.status];
        return (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onClick(a)}
            className="w-full text-start"
          >
            <Card className={cn('hover:shadow-md active:scale-[0.99] transition-all border-2', s.ring, s.bg)}>
              <div className="p-3 sm:p-4 flex items-stretch gap-3 sm:gap-4">
                <div className="text-center min-w-[60px] sm:min-w-[80px] flex flex-col justify-center">
                  <div className="flex items-center justify-center gap-1">
                    {a.checkedInAt && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="הגיע" />}
                    <span className="font-display font-bold text-xl sm:text-2xl text-primary tabular-nums leading-none">{formatTime(a.startAt)}</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 tabular-nums">עד {formatTime(a.endAt)}</div>
                </div>
                <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: a.employee.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-semibold truncate text-base">{a.customer.fullName}</div>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0', s.ring, s.text)}>{s.label}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground truncate flex items-center gap-1.5 flex-wrap">
                    <Scissors className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span className="truncate">{a.service.name}</span>
                    <span className="opacity-50">·</span>
                    <span style={{ color: a.employee.color }} className="font-medium">{a.employee.user.fullName}</span>
                  </div>
                  <div className="sm:hidden flex items-center justify-between mt-1.5 text-xs">
                    <span className="text-muted-foreground tabular-nums">{a.service.durationMin} דק'</span>
                    <span className="font-bold text-primary font-display tabular-nums">{formatAgorot(a.priceAgorot)}</span>
                  </div>
                </div>
                <div className="hidden sm:block text-end">
                  <div className="font-bold text-primary font-display text-lg">{formatAgorot(a.priceAgorot)}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">{a.service.durationMin} דק'</div>
                </div>
              </div>
            </Card>
          </motion.button>
        );
      })}
    </div>
  );
}
