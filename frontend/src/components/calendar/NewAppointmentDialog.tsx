'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, User as UserIcon, Phone, Scissors, Calendar as CalendarIcon, Clock, Check, Search, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { cn, formatTime, formatAgorot } from '@/lib/utils';

interface Service { id: string; name: string; durationMin: number; priceAgorot: number; color: string; }
interface Employee { id: string; user: { id: string; fullName: string }; color: string; }
interface Slot { start: string; end: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  defaultDate?: Date;
  forcedEmployeeId?: string;  // for barber — locked to self
}

export function NewAppointmentDialog({ open, onClose, defaultDate, forcedEmployeeId }: Props) {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const [search, setSearch] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [customerLocked, setCustomerLocked] = useState(false); // selected from search
  const [employeeId, setEmployeeId] = useState<string | undefined>(forcedEmployeeId);
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [date, setDate] = useState<string>(() => (defaultDate || new Date()).toISOString().slice(0, 10));
  const [slot, setSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [count, setCount] = useState(4);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: searchResults = [] } = useQuery({
    queryKey: ['customers-search', debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return [];
      const { data } = await api.get<Array<{ id: string; user: { id: string; fullName: string; phone: string; email: string }; vip?: boolean; totalVisits: number }>>('/customers', { params: { q: debouncedSearch } });
      return data;
    },
    enabled: open && debouncedSearch.length >= 2 && !customerLocked,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await api.get<Service[]>('/services')).data,
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await api.get<Employee[]>('/employees')).data,
    enabled: !forcedEmployeeId,
  });

  // For barber: auto-fill self
  const myEmployeeId = useMemo(() => {
    if (forcedEmployeeId) return forcedEmployeeId;
    if (user?.role === 'BARBER' && user.employee?.id) return user.employee.id;
    return employeeId;
  }, [forcedEmployeeId, user, employeeId]);

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['availability', myEmployeeId, date, serviceId],
    enabled: open && !!myEmployeeId && !!serviceId,
    queryFn: async () => {
      const { data } = await api.get<{ slots: Slot[] }>('/availability', {
        params: { employeeId: myEmployeeId, date, serviceId },
      });
      return data.slots;
    },
  });

  const selectedService = services.find((s) => s.id === serviceId);

  const createMut = useMutation({
    mutationFn: async () => {
      // 1. Create or find customer
      const { data: customer } = await api.post('/customers/quick', { fullName, phone });
      // 2. Create appointment (single or recurring series)
      if (recurring) {
        const { data } = await api.post('/appointments/series', {
          customerUserId: customer.userId,
          employeeId: myEmployeeId,
          serviceId,
          startAt: slot!.start,
          notes: notes || undefined,
          frequency,
          count,
        });
        return { ...data, _series: true };
      }
      const { data } = await api.post('/appointments', {
        customerUserId: customer.userId,
        employeeId: myEmployeeId,
        serviceId,
        startAt: slot!.start,
        notes: notes || undefined,
      });
      return data;
    },
    onSuccess: (data: { _series?: boolean; appointments?: unknown[] }) => {
      if (data?._series) {
        toast.success(`🎉 נוצרה סדרת ${data.appointments?.length ?? count} תורים`);
      } else {
        toast.success('🎉 התור נוסף ליומן');
      }
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
      handleClose();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה ביצירת התור');
    },
  });

  function handleClose() {
    setFullName(''); setPhone(''); setServiceId(undefined); setSlot(null); setNotes('');
    setSearch(''); setCustomerLocked(false);
    setRecurring(false); setFrequency('WEEKLY'); setCount(4);
    if (!forcedEmployeeId) setEmployeeId(undefined);
    onClose();
  }

  const canSubmit = fullName.trim().length >= 2 && phone.replace(/\D/g, '').length >= 9 && myEmployeeId && serviceId && slot;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 40, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <Card className="overflow-hidden rounded-t-2xl sm:rounded-2xl">
              <div className="p-5 pb-4 border-b flex items-center justify-between gold-gradient text-white">
                <div>
                  <h2 className="font-display text-xl font-bold leading-tight">תור חדש</h2>
                  <p className="text-xs opacity-90 mt-0.5">הוסף תור ידנית ליומן</p>
                </div>
                <button onClick={handleClose} className="p-2 -m-2 opacity-90 hover:opacity-100" aria-label="סגור">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Customer */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UserIcon className="w-4 h-4 text-primary" /> פרטי לקוח
                  </div>

                  {customerLocked ? (
                    <div className="rounded-lg border-2 border-primary bg-primary/10 p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center font-bold text-primary">
                        {fullName.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate flex items-center gap-1">
                          {fullName} <span className="text-xs text-primary">לקוח קיים ✓</span>
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">{phone}</div>
                      </div>
                      <button
                        onClick={() => { setCustomerLocked(false); setFullName(''); setPhone(''); setSearch(''); }}
                        className="text-muted-foreground hover:text-foreground p-1"
                        aria-label="שנה לקוח"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="חפש לקוח קיים לפי שם או טלפון..."
                          className="pe-10"
                        />
                      </div>
                      {debouncedSearch.length >= 2 && searchResults.length > 0 && (
                        <div className="rounded-lg border max-h-44 overflow-y-auto divide-y">
                          {searchResults.slice(0, 6).map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setFullName(c.user.fullName);
                                setPhone(c.user.phone);
                                setCustomerLocked(true);
                              }}
                              className="w-full text-start p-2.5 hover:bg-accent flex items-center gap-3"
                            >
                              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary text-sm">
                                {c.user.fullName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate flex items-center gap-1 text-sm">
                                  {c.user.fullName}
                                  {c.vip && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                                </div>
                                <div className="text-xs text-muted-foreground tabular-nums">{c.user.phone}</div>
                              </div>
                              {c.totalVisits > 0 && (
                                <span className="text-xs text-muted-foreground">{c.totalVisits} ביקורים</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground text-center my-1">— או הוסף לקוח חדש —</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">שם מלא *</Label>
                          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="שם פרטי ומשפחה" />
                        </div>
                        <div>
                          <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> טלפון *</Label>
                          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-1234567" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Barber (admin only) */}
                {!forcedEmployeeId && user?.role === 'ADMIN' && (
                  <div className="space-y-2">
                    <Label className="text-xs">ספר *</Label>
                    <div className="flex flex-wrap gap-2">
                      {employees.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setEmployeeId(e.id)}
                          className={cn(
                            'h-10 px-3 rounded-md border-2 text-sm font-medium flex items-center gap-2 transition-all',
                            (employeeId === e.id || forcedEmployeeId === e.id)
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-input hover:bg-accent',
                          )}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
                          {e.user.fullName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1"><Scissors className="w-3 h-3" /> שירות *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setServiceId(s.id); setSlot(null); }}
                        className={cn(
                          'p-2.5 rounded-lg border-2 text-start text-sm transition-all',
                          serviceId === s.id ? 'border-primary bg-primary/10' : 'border-input hover:bg-accent',
                        )}
                      >
                        <div className="font-medium truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground flex justify-between mt-0.5">
                          <span>{s.durationMin} דק'</span>
                          <span className="font-semibold text-primary">{formatAgorot(s.priceAgorot)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> תאריך *</Label>
                  <DatePicker value={date} min={new Date().toISOString().slice(0, 10)} onChange={(iso) => { setDate(iso); setSlot(null); }} />
                </div>

                {/* Time slots */}
                {myEmployeeId && serviceId && (
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> שעה *</Label>
                    {slotsLoading ? (
                      <div className="text-sm text-muted-foreground py-3 text-center">טוען זמינות...</div>
                    ) : slots.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-3 text-center border rounded-md">אין זמינות בתאריך זה</div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-1">
                        {slots.map((s) => (
                          <button
                            key={s.start}
                            onClick={() => setSlot(s)}
                            className={cn(
                              'h-10 rounded-md border-2 text-sm font-medium tabular-nums transition-all',
                              slot?.start === s.start ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:bg-accent',
                            )}
                          >
                            {formatTime(s.start)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-xs">הערות (לא חובה)</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="העדפות, אלרגיות, וכו'" />
                </div>

                {/* Recurring */}
                <div className="space-y-2 rounded-lg border p-3 bg-secondary/20">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recurring}
                      onChange={(e) => setRecurring(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    🔁 תור חוזר (סדרה)
                  </label>
                  {recurring && (
                    <div className="space-y-2 pt-2">
                      <div className="flex flex-wrap gap-2">
                        {([
                          ['WEEKLY', 'שבועי'],
                          ['BIWEEKLY', 'דו-שבועי'],
                          ['MONTHLY', 'חודשי'],
                        ] as const).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setFrequency(key)}
                            className={cn(
                              'h-9 px-3 rounded-md border-2 text-sm font-medium transition-all',
                              frequency === key
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-input hover:bg-accent',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">מספר תורים:</Label>
                        <Input
                          type="number"
                          min={2}
                          max={24}
                          value={count}
                          onChange={(e) => setCount(Math.max(2, Math.min(24, parseInt(e.target.value || '2', 10))))}
                          className="w-20 h-9"
                        />
                        <span className="text-xs text-muted-foreground">(2–24)</span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedService && slot && (
                  <div className="rounded-lg bg-primary/10 p-3 text-sm border border-primary/30 flex items-center justify-between">
                    <span className="text-muted-foreground">סה״כ לתשלום</span>
                    <span className="text-xl font-bold text-primary font-display">{formatAgorot(selectedService.priceAgorot)}</span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-secondary/30 flex gap-2">
                <Button variant="ghost" onClick={handleClose} className="flex-1">ביטול</Button>
                <Button
                  variant="gold"
                  className="flex-1"
                  disabled={!canSubmit || createMut.isPending}
                  onClick={() => createMut.mutate()}
                >
                  {createMut.isPending ? 'יוצר...' : <><Check className="w-4 h-4 ms-1" /> צור תור</>}
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
