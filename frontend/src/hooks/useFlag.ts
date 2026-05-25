'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Flag {
  key: string;
  enabled: boolean;
  description: string | null;
}

export function useFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => (await api.get<Flag[]>('/feature-flags')).data,
    staleTime: 60_000,
  });
}

export function useFlag(key: string): boolean {
  const { data } = useFlags();
  return data?.find((f) => f.key === key)?.enabled ?? false;
}
