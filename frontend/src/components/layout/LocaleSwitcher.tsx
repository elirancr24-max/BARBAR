'use client';

import { useEffect, useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { useLocale } from '@/store/locale';
import { SUPPORTED_LOCALES, LOCALE_LABELS, LOCALE_FLAGS, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);

  // Apply locale to <html> on mount
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr';
  }, [locale]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = () => setOpen(false);
    setTimeout(() => document.addEventListener('click', onClick), 0);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={cn(
          'flex items-center gap-1.5 h-10 rounded-md transition-colors hover:bg-accent',
          compact ? 'px-2 text-sm' : 'px-3 text-sm',
        )}
        aria-label="שפה"
      >
        <Languages className="w-4 h-4" />
        <span>{LOCALE_FLAGS[locale]}</span>
        {!compact && <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>}
      </button>
      {open && (
        <div
          className="absolute end-0 top-full mt-1 min-w-[140px] rounded-lg border bg-card shadow-lg z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {SUPPORTED_LOCALES.map((l: Locale) => (
            <button
              key={l}
              onClick={() => { setLocale(l); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors',
                locale === l && 'bg-primary/10 text-primary font-medium',
              )}
            >
              <span className="flex items-center gap-2">
                <span>{LOCALE_FLAGS[l]}</span>
                <span>{LOCALE_LABELS[l]}</span>
              </span>
              {locale === l && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
