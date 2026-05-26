'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Clock,
  Coffee,
  Save,
  Copy,
  Check,
  MessageSquare,
  RotateCcw,
  Power,
  Info,
  Phone,
  User as UserIcon,
  CalendarX,
  Palette,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TimeOffManager } from '@/components/time-off/TimeOffManager';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils';

type TabKey = 'details' | 'hours' | 'timeoff' | 'templates';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'details', label: 'פרטים', icon: UserIcon },
  { key: 'hours', label: 'שעות פעילות', icon: Clock },
  { key: 'timeoff', label: 'חופשות', icon: CalendarX },
  { key: 'templates', label: 'תבניות WhatsApp', icon: MessageSquare },
];

export default function AdminProfilePage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">טוען...</div>}>
      <ProfileInner />
    </Suspense>
  );
}

function ProfileInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const initialTab = (sp.get('tab') as TabKey) || 'details';
  const [tab, setTab] = useState<TabKey>(
    TABS.some((t) => t.key === initialTab) ? initialTab : 'details',
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.replace(url.pathname + '?' + url.searchParams.toString(), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <>
      <TopBar title="הפרופיל שלי" subtitle="ניהול הפרטים, השעות, החופשות והתבניות שלך" />
      <div className="p-4 lg:p-6 page-enter max-w-5xl pb-24 lg:pb-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 border-b">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'px-4 py-2.5 -mb-px border-b-2 text-sm font-medium flex items-center gap-2 transition-colors',
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'details' && <DetailsTab />}
        {tab === 'hours' && <HoursTab />}
        {tab === 'timeoff' && <TimeOffTab />}
        {tab === 'templates' && <TemplatesTab />}
      </div>
    </>
  );
}

// ─────────────────────────────────────────
// Tab 1: Details (bio, color, whatsappPhone)
// ─────────────────────────────────────────

interface MeEmployee {
  id: string;
  bio: string | null;
  color: string;
  whatsappPhone: string | null;
  user: { id: string; fullName: string; email: string; phone: string };
}

function DetailsTab() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ['employees', 'me'],
    queryFn: async () => (await api.get<MeEmployee>('/employees/me')).data,
  });

  const [bio, setBio] = useState('');
  const [color, setColor] = useState('#c9a961');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (me) {
      setBio(me.bio || '');
      setColor(me.color || '#c9a961');
      setWhatsappPhone(me.whatsappPhone || '');
      setDirty(false);
    }
  }, [me]);

  const saveMut = useMutation({
    mutationFn: async () =>
      api.put('/employees/me', {
        bio: bio.trim() || null,
        color,
        whatsappPhone: whatsappPhone.trim() || null,
      }),
    onSuccess: () => {
      toast.success('הפרטים נשמרו ✅');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['employees', 'me'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה בשמירה');
    },
  });

  if (isLoading) {
    return <Card className="h-48 animate-pulse" />;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-xl shrink-0"
            style={{ background: color }}
          >
            {(me?.user.fullName || user?.fullName || '?').charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-lg truncate">{me?.user.fullName || user?.fullName}</div>
            <div className="text-xs text-muted-foreground truncate">{me?.user.email || user?.email}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><UserIcon className="w-4 h-4" />שם</Label>
            <Input value={me?.user.fullName || ''} disabled />
            <p className="text-xs text-muted-foreground">לעדכון שם פנה להגדרות החשבון.</p>
          </div>

          <div className="space-y-2">
            <Label>ביוגרפיה / תיאור קצר</Label>
            <textarea
              value={bio}
              onChange={(e) => { setBio(e.target.value); setDirty(true); }}
              rows={3}
              maxLength={500}
              dir="auto"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              placeholder="כמה מילים עליך..."
            />
            <div className="text-xs text-muted-foreground text-end">{bio.length} / 500</div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Palette className="w-4 h-4" />צבע פרופיל</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => { setColor(e.target.value); setDirty(true); }}
                className="w-12 h-12 rounded-lg cursor-pointer border"
              />
              <Input
                value={color}
                onChange={(e) => { setColor(e.target.value); setDirty(true); }}
                className="flex-1 font-mono"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Phone className="w-4 h-4" />מספר וואטסאפ</Label>
            <Input
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={whatsappPhone}
              onChange={(e) => { setWhatsappPhone(e.target.value); setDirty(true); }}
              placeholder="050-1234567 או 972501234567"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              המספר שאליו לקוחות ישלחו הודעות. השאר ריק כדי להשתמש במספר החשבון.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="gold"
              disabled={!dirty || saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              <Save className="w-4 h-4 ms-2" />
              {saveMut.isPending ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────
// Tab 2: Working hours
// ─────────────────────────────────────────

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

function HoursTab() {
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
    <div className="max-w-3xl space-y-3">
      <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 text-sm text-foreground flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary shrink-0" />
        <span>הפעל ימים שאתה עובד, הגדר שעות וגם הפסקת אמצע יום אם צריך.</span>
      </div>

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

                  {d.enabled && (
                    <div className="border-t bg-secondary/30 p-4 space-y-3">
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
    </div>
  );
}

// ─────────────────────────────────────────
// Tab 3: Time off
// ─────────────────────────────────────────

function TimeOffTab() {
  return (
    <div className="max-w-3xl">
      <TimeOffManager scope="self" />
    </div>
  );
}

// ─────────────────────────────────────────
// Tab 4: WhatsApp templates
// ─────────────────────────────────────────

interface TemplateItem {
  key: string;
  label: string;
  description: string;
  toCustomer: boolean;
  enabled: boolean;
  template: string;
  defaultTemplate: string;
  isCustomized: boolean;
}

const VARIABLES = [
  { token: '{customerName}', label: 'שם הלקוח' },
  { token: '{customerPhone}', label: 'טלפון הלקוח' },
  { token: '{serviceName}', label: 'שירות' },
  { token: '{employeeName}', label: 'שם הספר' },
  { token: '{dateTime}', label: 'תאריך ושעה' },
  { token: '{businessName}', label: 'שם העסק' },
];

function TemplatesTab() {
  const qc = useQueryClient();
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-templates'],
    queryFn: async () => (await api.get<{ templates: TemplateItem[] }>('/employees/me/templates')).data,
    retry: 1,
  });

  useEffect(() => {
    if (data?.templates && data.templates.length > 0 && items.length === 0) {
      setItems(data.templates);
      setActiveKey((cur) => cur ?? data.templates[0]?.key ?? null);
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, { enabled: boolean; template: string }> = {};
      for (const t of items) {
        payload[t.key] = { enabled: t.enabled, template: t.template };
      }
      return api.put('/employees/me/templates', { templates: payload });
    },
    onSuccess: () => {
      toast.success('הודעות נשמרו ✅');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['my-templates'] });
    },
    onError: () => toast.error('שגיאה בשמירה'),
  });

  const active = items.find((i) => i.key === activeKey);

  function updateActive(patch: Partial<TemplateItem>) {
    if (!active) return;
    setItems((prev) => prev.map((p) => (p.key === active.key ? { ...p, ...patch } : p)));
    setDirty(true);
  }

  function resetToDefault() {
    if (!active) return;
    updateActive({ template: active.defaultTemplate });
  }

  function insertVariable(token: string) {
    if (!active) return;
    updateActive({ template: active.template + ' ' + token });
  }

  return (
    <div className="max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <MessageSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">הודעות וואטסאפ אוטומטיות</p>
            <p className="text-muted-foreground">
              הגדר את ההודעות שיישלחו ללקוחות (אישור / ביטול / שינוי / תזכורת) ואת ההודעה שתישלח אליך כשלקוח קובע תור חדש.
            </p>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">טוען...</div>
      ) : error ? (
        <Card className="p-6 text-center">
          <p className="text-destructive font-medium mb-2">שגיאה בטעינת ההודעות</p>
          <p className="text-sm text-muted-foreground mb-4">{(error as Error).message}</p>
          <Button variant="outline" onClick={() => refetch()}>נסה שוב</Button>
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-3">לא נטענו הודעות. נסה לרענן.</p>
          <Button variant="outline" onClick={() => refetch()}>טען מחדש</Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-[260px_1fr] gap-4">
          <div className="space-y-2">
            {items.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveKey(t.key)}
                className={cn(
                  'w-full text-start p-3 rounded-xl border-2 transition-all',
                  activeKey === t.key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{t.label}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                      t.enabled ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {t.enabled ? 'פעיל' : 'כבוי'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                {!t.toCustomer && (
                  <span className="text-[10px] text-primary font-medium mt-1 inline-block">← אליך</span>
                )}
              </button>
            ))}
          </div>

          {active && (
            <Card className="p-5">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-bold">{active.label}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{active.description}</p>
                </div>
                <Button
                  variant={active.enabled ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => updateActive({ enabled: !active.enabled })}
                >
                  <Power className="w-4 h-4 ms-1.5" />
                  {active.enabled ? 'כבה הודעה' : 'הפעל הודעה'}
                </Button>
              </div>

              <div className="mb-3">
                <Label className="mb-2 block">תוכן ההודעה</Label>
                <textarea
                  value={active.template}
                  onChange={(e) => updateActive({ template: e.target.value })}
                  disabled={!active.enabled}
                  rows={10}
                  maxLength={2000}
                  dir="auto"
                  className={cn(
                    'w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono leading-relaxed',
                    !active.enabled && 'opacity-50',
                  )}
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{active.template.length} / 2000</span>
                  {active.isCustomized && (
                    <Button variant="ghost" size="sm" onClick={resetToDefault} className="h-7 text-xs">
                      <RotateCcw className="w-3 h-3 ms-1" />
                      החזר ברירת מחדל
                    </Button>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <Label className="mb-2 block flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  משתנים זמינים — לחץ כדי להוסיף
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      disabled={!active.enabled}
                      onClick={() => insertVariable(v.token)}
                      className="text-xs px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-50 font-mono"
                      title={v.label}
                    >
                      {v.token}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <Label className="mb-2 block">תצוגה מקדימה</Label>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/40 p-4">
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">
                    {previewMessage(active.template)}
                  </pre>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {dirty && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-background/95 backdrop-blur-md border-t shadow-lg lg:start-64">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">יש שינויים שלא נשמרו</span>
            <Button variant="gold" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              <Save className="w-4 h-4 ms-1.5" />
              {saveMut.isPending ? 'שומר...' : 'שמור הודעות'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function previewMessage(template: string): string {
  const sample: Record<string, string> = {
    '{customerName}': 'דני כהן',
    '{customerPhone}': '050-1234567',
    '{serviceName}': 'תספורת + זקן',
    '{employeeName}': 'בר',
    '{dateTime}': 'יום שלישי, 28/05/2026, 14:30',
    '{businessName}': 'בר אברג׳יל',
    '{notes}': '',
  };
  let out = template;
  for (const [k, v] of Object.entries(sample)) {
    out = out.split(k).join(v);
  }
  return out;
}
