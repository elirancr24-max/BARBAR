'use client';

import { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ArrowRight, Phone, Mail, Calendar as CalIcon,
  Star, MessageCircle, RotateCcw, Cake, Tag, Plus, X as XIcon,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { LoyaltyCard } from '@/components/customers/LoyaltyCard';
import { CustomerTimeline } from '@/components/customers/CustomerTimeline';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api';
import { formatAgorot, cn } from '@/lib/utils';

interface Customer {
  id: string;
  vip: boolean;
  blocked?: boolean;
  blockedReason?: string | null;
  notes: string | null;
  tags: string[];
  totalVisits: number;
  loyaltyPoints: number;
  noShowCount?: number;
  lastNoShowAt?: string | null;
  marketingConsent?: boolean;
  marketingConsentAt?: string | null;
  termsAcceptedAt?: string | null;
  privacyAcceptedAt?: string | null;
  user: { id: string; fullName: string; email: string; phone: string; createdAt: string; birthday?: string | null };
}

const TAG_SUGGESTIONS = [
  { label: 'רגיש לעור', color: 'bg-rose-500/15 text-rose-600' },
  { label: 'שיער שטיפול', color: 'bg-blue-500/15 text-blue-600' },
  { label: 'מתולתל', color: 'bg-purple-500/15 text-purple-600' },
  { label: 'דק', color: 'bg-slate-500/15 text-slate-600' },
  { label: 'מבריק', color: 'bg-amber-500/15 text-amber-600' },
  { label: 'אלרגי', color: 'bg-red-500/15 text-red-700' },
  { label: 'מעדיף בר', color: 'bg-yellow-500/15 text-yellow-700' },
  { label: 'מעדיף ישי', color: 'bg-purple-500/15 text-purple-700' },
  { label: 'מעדיף עידן', color: 'bg-emerald-500/15 text-emerald-700' },
];

function tagColor(tag: string): string {
  return TAG_SUGGESTIONS.find((t) => t.label === tag)?.color || 'bg-primary/15 text-primary';
}

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  priceAgorot: number;
  notes: string | null;
  recurringSeriesId?: string | null;
  service: { id: string; name: string };
  employee: { id: string; color: string; user: { fullName: string } };
}

interface Props { params: Promise<{ id: string }>; }

export default function CustomerDetailPage({ params }: Props) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => (await api.get<Customer>(`/customers/${id}`)).data,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['customer-history', id],
    enabled: !!customer,
    queryFn: async () => (await api.get<Appointment[]>(`/customers/${id}/history`)).data,
  });

  const updateMut = useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      (await api.patch(`/customers/${id}`, data)).data,
    onSuccess: () => {
      toast.success('עודכן');
      qc.invalidateQueries({ queryKey: ['customer', id] });
      setNotesDraft(null);
      setTagInput('');
      setShowTagInput(false);
    },
  });
  // Backward compat
  const updateNotesMut = updateMut;

  function addTag(label: string) {
    if (!customer) return;
    const trimmed = label.trim();
    if (!trimmed || customer.tags.includes(trimmed)) return;
    updateMut.mutate({ tags: [...customer.tags, trimmed] });
  }
  function removeTag(label: string) {
    if (!customer) return;
    updateMut.mutate({ tags: customer.tags.filter((t) => t !== label) });
  }

  const resetNoShowMut = useMutation({
    mutationFn: async () => (await api.post(`/customers/${id}/reset-no-show`)).data,
    onSuccess: () => {
      toast.success('סטטוס no-show אופס');
      qc.invalidateQueries({ queryKey: ['customer', id] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה');
    },
  });

  const marketingConsentMut = useMutation({
    mutationFn: async (consent: boolean) =>
      (await api.patch(`/customers/${id}/marketing-consent`, { consent })).data,
    onSuccess: () => {
      toast.success('הסכמת השיווק עודכנה');
      qc.invalidateQueries({ queryKey: ['customer', id] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה');
    },
  });

  const cancelSeriesMut = useMutation({
    mutationFn: async (seriesId: string) => (await api.delete(`/appointments/series/${seriesId}`)).data,
    onSuccess: (data: { cancelled?: number }) => {
      toast.success(`בוטלה סדרה (${data?.cancelled ?? 0} תורים)`);
      qc.invalidateQueries({ queryKey: ['customer-history', id] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה בביטול הסדרה');
    },
  });

  const rebookMut = useMutation({
    mutationFn: async (appointmentId: string) => {
      // Default: rebook in 4 weeks at same time
      const original = history.find((h) => h.id === appointmentId);
      if (!original) return;
      const newDate = new Date(original.startAt);
      newDate.setDate(newDate.getDate() + 28);
      const { data } = await api.post(`/appointments/${appointmentId}/clone`, {
        startAt: newDate.toISOString(),
      });
      return data;
    },
    onSuccess: (data) => {
      if (!data) return;
      toast.success('🎉 התור הבא נקבע!');
      qc.invalidateQueries({ queryKey: ['customer-history', id] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה');
    },
  });

  const completed = history.filter((h) => h.status === 'COMPLETED');
  const totalSpent = completed.reduce((s, a) => s + a.priceAgorot, 0);
  const lastVisit = completed[0]?.startAt;
  const lastService = completed[0];

  return (
    <>
      <TopBar title={customer?.user.fullName || 'לקוח'} subtitle={customer?.user.phone} />
      <div className="p-4 lg:p-6 space-y-6 max-w-4xl page-enter">
        <Link href="/admin/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowRight className="w-4 h-4" /> חזרה ללקוחות
        </Link>

        {isLoading || !customer ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (
          <>
            {/* Hero card */}
            <Card className="overflow-hidden">
              <div className="p-6 gold-gradient text-white relative">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl font-bold ring-4 ring-white/30">
                    {customer.user.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                      {customer.user.fullName}
                      {customer.vip && <Star className="w-5 h-5 fill-white" />}
                    </h2>
                    <a href={`tel:${customer.user.phone}`} className="text-sm opacity-90 flex items-center gap-1 mt-1">
                      <Phone className="w-3.5 h-3.5" /> {customer.user.phone}
                    </a>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => updateNotesMut.mutate({ vip: !customer.vip })}
                      className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                        customer.vip ? 'bg-white/30 hover:bg-white/40' : 'bg-white/10 hover:bg-white/25')}
                    >
                      <Star className={cn('w-4 h-4 inline ms-1', customer.vip && 'fill-current')} />
                      {customer.vip ? 'VIP' : 'הגדר כ-VIP'}
                    </button>
                    <button
                      onClick={async () => {
                        if (customer.blocked) {
                          updateNotesMut.mutate({ blocked: false, blockedReason: null });
                        } else {
                          const reason = window.prompt('סיבת החסימה (לא חובה — נשמר לעיון פנימי):') ?? null;
                          if (reason !== null || window.confirm('לחסום לקוח זה? לא יוכל לקבוע תורים נוספים.')) {
                            updateNotesMut.mutate({ blocked: true, blockedReason: reason || undefined });
                          }
                        }
                      }}
                      className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                        customer.blocked ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-white/10 hover:bg-white/25')}
                    >
                      {customer.blocked ? '🔓 בטל חסימה' : '🚫 חסום לקוח'}
                    </button>
                  </div>
                </div>
                {customer.blocked && (
                  <div className="mt-3 p-2.5 rounded-lg bg-red-600/20 text-sm flex items-start gap-2">
                    <span className="font-bold">לקוח חסום</span>
                    {customer.blockedReason && <span className="opacity-90">· {customer.blockedReason}</span>}
                  </div>
                )}
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse border-t">
                <div className="p-4 text-center">
                  <div className="text-2xl font-bold font-display tabular-nums">{completed.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">ביקורים</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-2xl font-bold font-display tabular-nums text-primary">{formatAgorot(totalSpent)}</div>
                  <div className="text-xs text-muted-foreground mt-1">סה״כ הוציא</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-2xl font-bold font-display tabular-nums">{history.filter(h => h.status === 'NO_SHOW').length}</div>
                  <div className="text-xs text-muted-foreground mt-1">לא הגיע</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-sm font-medium tabular-nums">
                    {lastVisit ? new Date(lastVisit).toLocaleDateString('he-IL', { day: '2-digit', month: 'short' }) : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">ביקור אחרון</div>
                </div>
              </div>
            </Card>

            {/* No-show status */}
            <Card>
              <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    סטטוס no-show: <span className="font-bold tabular-nums">{customer.noShowCount ?? 0}</span>
                    {(customer.noShowCount ?? 0) >= 2 && (
                      <span className="ms-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-700 dark:text-red-300">
                        סיכון
                      </span>
                    )}
                  </div>
                  {customer.lastNoShowAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      אחרון: {new Date(customer.lastNoShowAt).toLocaleDateString('he-IL')}
                    </div>
                  )}
                </div>
                {(customer.noShowCount ?? 0) > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('לאפס את מונה ה-no-show של הלקוח?')) {
                        resetNoShowMut.mutate();
                      }
                    }}
                    disabled={resetNoShowMut.isPending}
                  >
                    אפס
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Loyalty punch card */}
            <LoyaltyCard customerId={customer.id} points={customer.loyaltyPoints ?? 0} />

            {/* Quick rebook + contact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {lastService && (
                <Button
                  variant="gold"
                  size="lg"
                  className="md:col-span-2 h-14 justify-start text-start"
                  onClick={() => rebookMut.mutate(lastService.id)}
                  disabled={rebookMut.isPending}
                >
                  <RotateCcw className="w-5 h-5 ms-2" />
                  <div className="text-start">
                    <div className="font-bold">קבע שוב אותו דבר</div>
                    <div className="text-xs opacity-90">{lastService.service.name} · עוד 4 שבועות</div>
                  </div>
                </Button>
              )}
              <a href={`tel:${customer.user.phone}`} className="h-14 rounded-md border bg-card hover:bg-accent flex items-center justify-center gap-2 font-medium transition-colors">
                <Phone className="w-4 h-4" /> חייג
              </a>
              <a href={`https://wa.me/${customer.user.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="h-14 rounded-md border bg-card hover:bg-accent flex items-center justify-center gap-2 font-medium transition-colors col-span-1">
                <MessageCircle className="w-4 h-4 text-emerald-500" /> WhatsApp
              </a>
            </div>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" /> תיוגים והעדפות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {customer.tags.length === 0 && !showTagInput && (
                    <span className="text-sm text-muted-foreground">לחץ "+" להוספת תווית — VIP, רגיש, מעדיף ספר…</span>
                  )}
                  {customer.tags.map((tag) => (
                    <span key={tag} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', tagColor(tag))}>
                      {tag}
                      <button onClick={() => removeTag(tag)} className="opacity-60 hover:opacity-100" aria-label="הסר">
                        <XIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {showTagInput ? (
                    <div className="flex items-center gap-1">
                      <Input
                        autoFocus
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && tagInput) { e.preventDefault(); addTag(tagInput); }
                          if (e.key === 'Escape') { setShowTagInput(false); setTagInput(''); }
                        }}
                        placeholder="תווית חדשה"
                        className="h-7 text-xs w-32"
                      />
                      <button onClick={() => addTag(tagInput)} className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center" aria-label="הוסף">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowTagInput(true)}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border-2 border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <Plus className="w-3 h-3" /> תווית
                    </button>
                  )}
                </div>

                {/* Suggestions */}
                {showTagInput && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                    <span className="text-xs text-muted-foreground self-center">הצעות:</span>
                    {TAG_SUGGESTIONS.filter((s) => !customer.tags.includes(s.label)).map((s) => (
                      <button
                        key={s.label}
                        onClick={() => addTag(s.label)}
                        className={cn('rounded-full px-2 py-0.5 text-xs font-medium hover:opacity-80', s.color)}
                      >
                        + {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Birthday */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cake className="w-4 h-4 text-pink-500" /> תאריך לידה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <DatePicker
                  value={customer.user.birthday || ''}
                  onChange={(iso) => updateMut.mutate({ birthday: iso })}
                  placeholder="הוסף תאריך לידה"
                />
                {customer.user.birthday && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    🎂 {new Date(customer.user.birthday).toLocaleDateString('he-IL', { day: '2-digit', month: 'long' })}
                    <button
                      onClick={() => updateMut.mutate({ birthday: null })}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      הסר
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes & metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">הערות פרטיות</CardTitle>
              </CardHeader>
              <CardContent>
                {notesDraft === null ? (
                  <button
                    onClick={() => setNotesDraft(customer.notes || '')}
                    className="w-full text-start min-h-[60px] text-sm bg-secondary/40 hover:bg-secondary rounded-lg p-3 border-s-4 border-primary"
                  >
                    {customer.notes ? <span>📝 {customer.notes}</span> : <span className="text-muted-foreground">+ הוסף הערה (העדפות, אלרגיות, רגישויות...)</span>}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Input value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="העדפות, אלרגיות, רגישויות..." autoFocus />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setNotesDraft(null)}>ביטול</Button>
                      <Button variant="gold" size="sm" onClick={() => updateNotesMut.mutate({ notes: notesDraft })}>שמור</Button>
                    </div>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {customer.user.email}</div>
                  <div className="flex items-center gap-1.5"><CalIcon className="w-3.5 h-3.5" /> רשום מאז {new Date(customer.user.createdAt).toLocaleDateString('he-IL')}</div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy & consents (Amendment 13) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">פרטיות והסכמות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-muted-foreground text-xs">תנאי שימוש</div>
                    <div className="font-medium">
                      {customer.termsAcceptedAt
                        ? new Date(customer.termsAcceptedAt).toLocaleString('he-IL')
                        : 'לא אושר'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">מדיניות פרטיות</div>
                    <div className="font-medium">
                      {customer.privacyAcceptedAt
                        ? new Date(customer.privacyAcceptedAt).toLocaleString('he-IL')
                        : 'לא אושר'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-3 border-t">
                  <div>
                    <div className="font-medium">הסכמה לשיווק (WhatsApp)</div>
                    <div className="text-xs text-muted-foreground">
                      {customer.marketingConsentAt
                        ? `עודכן לאחרונה: ${new Date(customer.marketingConsentAt).toLocaleString('he-IL')}`
                        : 'מעולם לא עודכן'}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!customer.marketingConsent}
                    disabled={marketingConsentMut.isPending}
                    onClick={() => marketingConsentMut.mutate(!customer.marketingConsent)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      customer.marketingConsent ? 'bg-primary' : 'bg-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        customer.marketingConsent ? 'translate-x-1' : 'translate-x-6',
                      )}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <div>
              <h3 className="font-display font-bold text-xl mb-3">היסטוריית תורים ({history.length})</h3>
              {history.length === 0 ? (
                <EmptyState icon={CalIcon} title="עדיין אין תורים" description="התורים יופיעו כאן ברגע שיירשמו" />
              ) : (
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <AppointmentCard
                        appointment={h}
                        actions={
                          <>
                            {(h.status === 'COMPLETED' || h.status === 'CONFIRMED') && (
                              <button
                                onClick={() => rebookMut.mutate(h.id)}
                                disabled={rebookMut.isPending}
                                className="w-9 h-9 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors flex items-center justify-center"
                                title="קבע שוב בעוד 4 שבועות"
                                aria-label="רהבוקינג"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            {h.recurringSeriesId && (h.status === 'PENDING' || h.status === 'CONFIRMED') && (
                              <button
                                onClick={() => {
                                  if (window.confirm('לבטל את כל התורים העתידיים בסדרה זו?')) {
                                    cancelSeriesMut.mutate(h.recurringSeriesId!);
                                  }
                                }}
                                disabled={cancelSeriesMut.isPending}
                                className="w-9 h-9 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors flex items-center justify-center"
                                title="בטל סדרה"
                                aria-label="בטל סדרה"
                              >
                                <XIcon className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        }
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h3 className="font-display font-bold text-xl mb-3">ציר זמן</h3>
              <CustomerTimeline customerId={id} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
