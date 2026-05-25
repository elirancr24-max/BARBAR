'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Banknote, CreditCard, Smartphone, ArrowRightLeft, MoreHorizontal, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { cn, formatAgorot } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  defaultAmountAgorot: number;
  customerName: string;
}

const methods = [
  { key: 'cash', label: 'מזומן', icon: Banknote, color: 'text-emerald-600 bg-emerald-500/15' },
  { key: 'card', label: 'אשראי', icon: CreditCard, color: 'text-blue-600 bg-blue-500/15' },
  { key: 'bit', label: 'ביט', icon: Smartphone, color: 'text-purple-600 bg-purple-500/15' },
  { key: 'transfer', label: 'העברה', icon: ArrowRightLeft, color: 'text-amber-600 bg-amber-500/15' },
  { key: 'other', label: 'אחר', icon: MoreHorizontal, color: 'text-slate-600 bg-slate-500/15' },
] as const;

type Method = (typeof methods)[number]['key'];

export function PaymentDialog({ open, onClose, appointmentId, defaultAmountAgorot, customerName }: Props) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(defaultAmountAgorot / 100);
  const [tip, setTip] = useState(0);
  const [method, setMethod] = useState<Method | null>(null);
  const [markComplete, setMarkComplete] = useState(true);

  useEffect(() => {
    if (open) {
      setAmount(defaultAmountAgorot / 100);
      setTip(0);
      setMethod(null);
      setMarkComplete(true);
    }
  }, [open, defaultAmountAgorot]);

  const payMut = useMutation({
    mutationFn: async () =>
      (await api.post(`/appointments/${appointmentId}/pay`, {
        amountAgorot: Math.round(amount * 100),
        tipAgorot: Math.round(tip * 100),
        method,
        markCompleted: markComplete,
      })).data,
    onSuccess: () => {
      toast.success('💰 התשלום נרשם');
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['end-of-day'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה');
    },
  });

  const total = amount + tip;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 60, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="w-full sm:max-w-md"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <Card className="overflow-hidden rounded-t-2xl sm:rounded-2xl">
              <div className="p-5 pb-4 gold-gradient text-white relative">
                <button onClick={onClose} className="absolute start-4 top-4 opacity-90 hover:opacity-100" aria-label="סגור">
                  <X className="w-5 h-5" />
                </button>
                <div className="text-xs uppercase tracking-widest opacity-90">רישום תשלום</div>
                <h2 className="font-display text-2xl font-bold mt-1 truncate">{customerName}</h2>
              </div>

              <div className="p-5 space-y-4">
                {/* Method picker */}
                <div className="space-y-2">
                  <Label className="text-xs">שיטת תשלום *</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {methods.map((m) => {
                      const Icon = m.icon;
                      const active = method === m.key;
                      return (
                        <button
                          key={m.key}
                          onClick={() => setMethod(m.key)}
                          className={cn(
                            'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                            active ? 'border-primary bg-primary/10' : 'border-input hover:bg-accent',
                          )}
                        >
                          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center', m.color)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">סכום (₪)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                      className="text-lg font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">טיפ (₪)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="1"
                      value={tip}
                      onChange={(e) => setTip(Math.max(0, Number(e.target.value)))}
                      className="text-lg font-bold tabular-nums"
                    />
                  </div>
                </div>

                {/* Quick tip buttons */}
                <div className="flex gap-2">
                  <span className="text-xs text-muted-foreground self-center">טיפ מהיר:</span>
                  {[10, 20, 30, 50].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTip(t)}
                      className={cn(
                        'h-8 px-2.5 rounded-md text-xs font-medium border transition-colors',
                        tip === t ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent',
                      )}
                    >
                      ₪{t}
                    </button>
                  ))}
                </div>

                {/* Total */}
                <div className="rounded-lg bg-primary/10 p-3 border border-primary/30 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">סה״כ לרישום</span>
                  <span className="text-2xl font-bold text-primary font-display tabular-nums">
                    {formatAgorot(Math.round(total * 100))}
                  </span>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markComplete}
                    onChange={(e) => setMarkComplete(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  סמן את התור כהושלם
                </label>
              </div>

              <div className="p-4 border-t bg-secondary/30 flex gap-2">
                <Button variant="ghost" onClick={onClose} className="flex-1">ביטול</Button>
                <Button
                  variant="gold"
                  className="flex-1"
                  disabled={!method || amount <= 0 || payMut.isPending}
                  onClick={() => payMut.mutate()}
                >
                  {payMut.isPending ? 'שומר...' : <><Check className="w-4 h-4 ms-1" /> רשום תשלום</>}
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
