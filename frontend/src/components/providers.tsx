'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { useTheme } from '@/store/theme';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Aggressive caching — pages feel instant on revisit
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
      },
    },
  }));
  const theme = useTheme((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <QueryClientProvider client={qc}>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
      <Toaster position="top-center" richColors closeButton dir="rtl" />
    </QueryClientProvider>
  );
}
