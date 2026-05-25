import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n';

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocale = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'he',
      setLocale: (l) => {
        if (!SUPPORTED_LOCALES.includes(l)) return;
        set({ locale: l });
        if (typeof document !== 'undefined') {
          document.documentElement.lang = l;
          document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
        }
      },
    }),
    { name: 'barbar-locale' },
  ),
);
