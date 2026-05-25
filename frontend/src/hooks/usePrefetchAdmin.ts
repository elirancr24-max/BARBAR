'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Warm common queries shared across admin pages so navigation is instant.
 */
export function usePrefetchAdmin() {
  const qc = useQueryClient();

  useEffect(() => {
    const idle = (cb: () => void) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 1500 });
      else setTimeout(cb, 800);
    };

    idle(() => {
      qc.prefetchQuery({
        queryKey: ['services'],
        queryFn: async () => (await api.get('/services')).data,
      });
      qc.prefetchQuery({
        queryKey: ['employees'],
        queryFn: async () => (await api.get('/employees')).data,
      });
      qc.prefetchQuery({
        queryKey: ['dashboard'],
        queryFn: async () => (await api.get('/reports/dashboard')).data,
      });
      qc.prefetchQuery({
        queryKey: ['feature-flags'],
        queryFn: async () => (await api.get('/feature-flags')).data,
      });
    });
  }, [qc]);
}
