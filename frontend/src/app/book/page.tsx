'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, Clock, Scissors, Calendar as CalendarIcon, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { api } from '@/lib/api';
import { cn, formatAgorot, formatTime } from '@/lib/utils';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

interface Service { id: string; name: string; description?: string|null; durationMin: number; priceAgorot: number; color: string; }
interface Slot { start: string; end: string; }
interface BookingResult {
  id: string;
  confirmation: string;
  service: string;
  employee: string;
  startAt: string;
  priceAgorot: number;
  barberWhatsapp?: { url: string; message: string } | null;
}

const steps = ['שירות', 'תאריך ושעה', 'פרטים ואישור'];

function getGuestId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('barbar-guest-id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('barbar-guest-id', id);
  }
  return id;
}

export default function BookPage() {
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState<Slot | null>(null);
  const [lockId, setLockId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string>('');
  const [contact, setContact] = useState({ fullName: '', phone: '', email: '', notes: '' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => { setOwnerId(getGuestId()); }, []);

  const { data: bizSettings } = useBusinessSettings();
  const cancelCutoffHr = bizSettings?.selfCancelCutoffHr ?? 4;

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await api.get<Service[]>('/services')).data,
  });
  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['availability', date, serviceId],
    enabled: !!serviceId,
    queryFn: async () => {
      const { data } = await api.get<{ slots: Slot[] }>('/availability', {
        params: { date, serviceId },
      });
      return data.slots;
    },
  });

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);

  const lockMutation = useMutation({
    mutationFn: async (s: Slot) => {
      const { data } = await api.post<{ lockId: string; ownerId: string }>('/slots/lock', {
        startAt: s.start,
        guestId: ownerId,
      });
      return data;
    },
    onSuccess: (data, s) => {
      setSlot(s);
      setLockId(data.lockId);
      setStep(2);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'הסלוט נתפס, נסה אחר');
    },
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<BookingResult>('/guest-booking', {
        fullName: contact.fullName,
        phone: contact.phone,
        email: contact.email || undefined,
        serviceId,
        startAt: slot!.start,
        notes: contact.notes || undefined,
        termsAccepted: true,
        marketingConsent,
      });
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success('🎉 הבקשה נשלחה! ממתינה לאישור הספר');
      // Save confirmation code to localStorage so customer can find it later
      try {
        const stored: string[] = JSON.parse(localStorage.getItem('barbar:codes') || '[]');
        if (data.confirmation && !stored.includes(data.confirmation)) {
          stored.push(data.confirmation);
          // keep last 20
          localStorage.setItem('barbar:codes', JSON.stringify(stored.slice(-20)));
        }
      } catch { /* ignore */ }
      // Auto-open WhatsApp chat with the barber with prepared message
      if (data.barberWhatsapp?.url) {
        // Small delay so the success page renders first + browser allows window.open
        // because it's still in the user-click gesture context
        window.open(data.barberWhatsapp.url, '_blank');
      }
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה ביצירת תור');
    },
  });

  // Release lock if leaving the page without confirming
  useEffect(() => {
    return () => {
      if (lockId && slot && !result) {
        api.delete('/slots/lock', { data: { lockId, startAt: slot.start, ownerId } }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───────────────── Success screen ─────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
        <BookHeader />
        <div className="container max-w-xl py-16">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-10 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-14 h-14 text-emerald-500" />
              </motion.div>
              <h1 className="text-3xl font-bold mb-2">בקשת התור נשלחה!</h1>
              <p className="text-muted-foreground mb-2">
                הבקשה ממתינה לאישור הספר. תקבל אישור בוואטסאפ בקרוב.
              </p>
              <div className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 mb-6 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                ממתין לאישור
              </div>
              <div className="space-y-3 text-start bg-secondary/40 rounded-xl p-5 mb-6">
                <Row label="קוד אישור" value={result.confirmation} highlight />
                <Row label="שירות" value={result.service} />
                <Row label="מועד" value={new Date(result.startAt).toLocaleString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                <Row label="לתשלום" value={formatAgorot(result.priceAgorot)} />
              </div>
              <div className="space-y-3">
                {result.barberWhatsapp && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp נפתח עם {result.employee}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">לחץ שלח בוואטסאפ כדי להשלים את ההודעה לספר</p>
                    <button
                      type="button"
                      className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                      onClick={() => window.open(result.barberWhatsapp!.url, '_blank')}
                    >
                      לא נפתח? לחץ כאן לפתיחה מחדש →
                    </button>
                  </div>
                )}
                <Button variant="gold" asChild className="w-full h-12">
                  <Link href={`/booking/${result.confirmation}`}>צפה / בטל את התור שלי</Link>
                </Button>
                <Button variant="outline" asChild className="w-full h-12">
                  <Link href="/my-bookings">כל התורים שלי</Link>
                </Button>
                <div className="text-xs text-muted-foreground bg-secondary/40 border rounded-lg p-3 leading-relaxed text-start">
                  <div className="font-medium text-foreground mb-1">מדיניות ביטולים</div>
                  <div>
                    ביטול עד {cancelCutoffHr} שעות לפני התור — ללא דמי ביטול.
                  </div>
                  <Link
                    href="/cancellation-policy"
                    target="_blank"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    קרא את המדיניות המלאה
                  </Link>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" asChild className="flex-1"><Link href="/">חזרה לדף הבית</Link></Button>
                  <Button variant="ghost" onClick={() => { setResult(null); setStep(0); setServiceId(null); setSlot(null); setLockId(null); setContact({ fullName: '', phone: '', email: '', notes: '' }); }} className="flex-1">תור נוסף</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <BookHeader />

      <div className="container max-w-3xl py-6 lg:py-8 pb-24 lg:pb-8">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors shrink-0',
                i < step ? 'bg-primary border-primary text-primary-foreground' :
                i === step ? 'border-primary text-primary' : 'border-muted text-muted-foreground',
              )}>
                {i < step ? <Check className="w-5 h-5" /> : i + 1}
              </div>
              <div className="flex-1 mx-2">
                <div className="text-xs font-medium hidden sm:block">{s}</div>
                {i < steps.length - 1 && <div className={cn('h-0.5 mt-1', i < step ? 'bg-primary' : 'bg-muted')} />}
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0 — Service */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Scissors className="w-7 h-7 text-primary" />
                בחר שירות
              </h2>
              <p className="text-muted-foreground mb-6">בחר את סוג הטיפול שלך</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((s) => (
                  <Card
                    key={s.id}
                    onClick={() => { setServiceId(s.id); setStep(1); /* go to date */ }}
                    className={cn(
                      'p-5 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all border-2 group',
                      serviceId === s.id ? 'border-primary' : 'border-transparent',
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: s.color + '20', color: s.color }}>
                        <Scissors className="w-6 h-6" />
                      </div>
                      <span className="text-2xl font-bold text-primary">{formatAgorot(s.priceAgorot)}</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{s.name}</h3>
                    {s.description && <p className="text-sm text-muted-foreground mb-3">{s.description}</p>}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground pt-2 border-t">
                      <Clock className="w-4 h-4" /> {s.durationMin} דק'
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 1 — Date & Time */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <CalendarIcon className="w-7 h-7 text-primary" />
                בחר תאריך ושעה
              </h2>
              <p className="text-muted-foreground mb-6">בחר את הזמן הנוח לך</p>
              <Card className="p-5 mb-6">
                <DatePicker
                  label="תאריך"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={setDate}
                  closedDays={[5, 6]}
                />
              </Card>
              {slotsLoading ? (
                <div className="text-center py-12 text-muted-foreground">טוען זמינות...</div>
              ) : slots.length === 0 ? (
                <Card className="p-8 text-center border-amber-500/30 bg-amber-500/5">
                  <CalendarIcon className="w-12 h-12 mx-auto text-amber-500 mb-3" />
                  <h3 className="font-bold text-lg mb-1">אין תורים פנויים בתאריך זה</h3>
                  <p className="text-sm text-muted-foreground mb-5">בחר תאריך אחר, או הצטרף לרשימת המתנה — נעדכן אותך כשמישהו מבטל.</p>
                  <Button
                    variant="gold"
                    size="lg"
                    onClick={() => {
                      const phone = window.prompt('הכנס את מספר הטלפון שלך לרשימת המתנה:');
                      const name = phone ? window.prompt('שמך המלא:') : null;
                      if (phone && name) {
                        api.post('/waitlist', {
                          customerName: name,
                          customerPhone: phone,
                          serviceId,
                          preferredDate: date ? new Date(date).toISOString() : undefined,
                        }).then(() => {
                          toast.success('✨ נרשמת לרשימת המתנה! נעדכן אותך בוואטסאפ כשמתפנה תור.');
                        }).catch(() => toast.error('שגיאה ברישום'));
                      }
                    }}
                  >
                    🔔 הצטרף לרשימת המתנה
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {slots.map((s) => (
                    <Button
                      key={s.start}
                      variant="outline"
                      disabled={lockMutation.isPending}
                      onClick={() => lockMutation.mutate(s)}
                      className="h-11 hover:border-primary hover:text-primary"
                    >
                      {formatTime(s.start)}
                    </Button>
                  ))}
                </div>
              )}
              <Button variant="ghost" onClick={() => setStep(0)} className="mt-6"><ChevronLeft className="w-4 h-4 ms-2" /> חזור</Button>
            </motion.div>
          )}

          {/* Step 2 — Contact & Confirm */}
          {step === 2 && slot && selectedService && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Check className="w-7 h-7 text-primary" />
                פרטים ואישור
              </h2>
              <p className="text-muted-foreground mb-6">השאר פרטי התקשרות ואשר את התור</p>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Contact form */}
                <Card className="p-6 space-y-4">
                  <h3 className="font-semibold text-lg mb-2">פרטים אישיים</h3>
                  <div className="space-y-2">
                    <Label>שם מלא *</Label>
                    <Input
                      value={contact.fullName}
                      onChange={(e) => setContact({ ...contact, fullName: e.target.value })}
                      placeholder="שם פרטי ומשפחה"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Phone className="w-4 h-4" />טלפון *</Label>
                    <Input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                      placeholder="050-1234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Mail className="w-4 h-4" />אימייל (לא חובה)</Label>
                    <Input
                      type="email"
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>הערות (לא חובה)</Label>
                    <Input
                      value={contact.notes}
                      onChange={(e) => setContact({ ...contact, notes: e.target.value })}
                      placeholder="משהו שכדאי לדעת?"
                    />
                  </div>

                  {/* Amendment 13 — consent checkboxes */}
                  <div className="space-y-2 pt-2 border-t">
                    <label className="flex items-start gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 accent-primary"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        required
                        aria-required="true"
                      />
                      <span>
                        אני מאשר/ת את{' '}
                        <Link href="/terms" target="_blank" className="text-primary hover:underline">תנאי השימוש</Link>
                        {' '}ואת{' '}
                        <Link href="/privacy" target="_blank" className="text-primary hover:underline">מדיניות הפרטיות</Link>
                        <span className="text-rose-500"> *</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 accent-primary"
                        checked={marketingConsent}
                        onChange={(e) => setMarketingConsent(e.target.checked)}
                      />
                      <span className="text-muted-foreground">
                        אני מעוניין/ת לקבל הודעות שיווקיות ב-WhatsApp
                      </span>
                    </label>
                  </div>
                </Card>

                {/* Summary */}
                <Card className="p-6">
                  <h3 className="font-semibold text-lg mb-4">סיכום ההזמנה</h3>
                  <div className="space-y-3">
                    <Row label="שירות" value={selectedService.name} />
                    <Row label="תאריך" value={new Date(slot.start).toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })} />
                    <Row label="שעה" value={formatTime(slot.start) + ' - ' + formatTime(slot.end)} />
                    <Row label="משך" value={`${selectedService.durationMin} דק'`} />
                    <Row label="מחיר" value={formatAgorot(selectedService.priceAgorot)} highlight />
                  </div>
                  <div className="mt-5 bg-primary/10 text-primary text-xs p-3 rounded-lg flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    הסלוט שמור עבורך ל-2 דקות
                  </div>
                </Card>
              </div>

              {/* Cancellation policy notice — required by Consumer Protection Law */}
              <div className="mt-6 text-xs text-muted-foreground bg-secondary/40 border rounded-lg p-3 leading-relaxed">
                <div>
                  ביטול עד <span className="font-semibold text-foreground">{cancelCutoffHr} שעות</span> לפני התור — ללא דמי ביטול.
                </div>
                <a
                  href="/cancellation-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  מדיניות ביטולים מלאה
                </a>
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="ghost" onClick={() => { setStep(1); setSlot(null); setLockId(null); }} className="flex-1">חזור</Button>
                <Button
                  variant="gold"
                  size="lg"
                  className="flex-1"
                  onClick={() => bookMutation.mutate()}
                  disabled={bookMutation.isPending || !contact.fullName || !contact.phone || !termsAccepted}
                >
                  {bookMutation.isPending ? 'מאשר...' : 'אשר וקבע תור'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BookHeader() {
  return (
    <header className="border-b backdrop-blur-md bg-background/80 sticky top-0 z-30">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="font-display font-black text-lg flex items-center gap-2.5">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 rounded-full gold-gradient p-[2px]">
              <div className="w-full h-full rounded-full overflow-hidden bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.jpg" alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
          בר אברג׳יל
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b last:border-b-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={cn('font-semibold', highlight && 'text-primary text-xl')}>{value}</span>
    </div>
  );
}
