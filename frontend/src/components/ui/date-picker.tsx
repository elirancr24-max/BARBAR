'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

interface Props {
  value: string | Date; // ISO date string yyyy-mm-dd or Date
  onChange: (iso: string) => void; // 'yyyy-mm-dd'
  min?: string | Date;
  max?: string | Date;
  placeholder?: string;
  className?: string;
  closedDays?: number[]; // 0=Sun..6=Sat
  label?: string;
}

function toDate(v: string | Date | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatHe(d: Date): string {
  return d.toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function DatePicker({ value, onChange, min, max, placeholder = 'בחר תאריך', className, closedDays, label }: Props) {
  const selected = toDate(value);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minDate = toDate(min);
  const maxDate = toDate(max);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(selected || today);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (selected) setView(selected); }, [value]); // eslint-disable-line

  // Close on outside click + ESC
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function disabled(d: Date): boolean {
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    if (closedDays && closedDays.includes(d.getDay())) return true;
    return false;
  }

  // Build month grid (rows of 7, starting Sunday)
  const firstOfMonth = new Date(view.getFullYear(), view.getMonth(), 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  function shiftMonth(delta: number) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  function select(d: Date) {
    if (disabled(d)) return;
    onChange(ymd(d));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      {label && <label className="text-sm font-medium block mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full h-11 px-3 rounded-md border border-input bg-background text-start',
          'flex items-center justify-between gap-2',
          'hover:border-primary/40 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'ring-2 ring-ring',
        )}
      >
        <span className={cn('text-base tabular-nums', !selected && 'text-muted-foreground')}>
          {selected ? formatHe(selected) : placeholder}
        </span>
        <CalendarIcon className={cn('w-4 h-4 shrink-0 transition-colors', open ? 'text-primary' : 'text-muted-foreground')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute z-50 mt-2 w-[320px] max-w-[calc(100vw-2rem)] right-0 rounded-xl border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-b from-primary/5 to-transparent">
              <button
                onClick={() => shiftMonth(-1)}
                aria-label="חודש קודם"
                className="w-9 h-9 rounded-md hover:bg-accent flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="font-display font-bold text-lg leading-none flex flex-col items-center">
                <span>{MONTHS[view.getMonth()]}</span>
                <span className="text-xs text-muted-foreground font-sans tabular-nums">{view.getFullYear()}</span>
              </div>
              <button
                onClick={() => shiftMonth(1)}
                aria-label="חודש הבא"
                className="w-9 h-9 rounded-md hover:bg-accent flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-0.5 px-2 pt-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="h-7 flex items-center justify-center text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5 p-2">
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="h-10" />;
                const dis = disabled(d);
                const isToday = isSameDay(d, today);
                const isSelected = selected && isSameDay(d, selected);
                return (
                  <button
                    key={i}
                    onClick={() => select(d)}
                    disabled={dis}
                    aria-pressed={isSelected || undefined}
                    aria-label={formatHe(d)}
                    className={cn(
                      'h-10 rounded-md font-medium text-sm tabular-nums transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      dis && 'opacity-25 cursor-not-allowed line-through',
                      !dis && !isSelected && 'hover:bg-accent active:scale-95',
                      isToday && !isSelected && 'text-primary font-bold ring-1 ring-primary/40',
                      isSelected && 'gold-gradient text-white font-bold shadow-md',
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t p-2 flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setView(today); }}>
                לחודש הנוכחי
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={() => !disabled(today) && select(today)}
                disabled={disabled(today)}
              >
                היום
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
