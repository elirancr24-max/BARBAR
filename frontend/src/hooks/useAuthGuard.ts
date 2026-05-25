'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth, type Role } from '@/store/auth';

export function useAuthGuard(allowedRoles?: Role[]) {
  const router = useRouter();
  const { user, setUser, clear } = useAuth();

  useEffect(() => {
    let cancelled = false;
    async function fetchMe() {
      try {
        const { data } = await api.get('/auth/me');
        if (cancelled) return;
        setUser(data);
        if (allowedRoles && !allowedRoles.includes(data.role)) {
          router.push('/');
        }
      } catch {
        if (cancelled) return;
        clear();
        router.push('/login');
      }
    }
    fetchMe();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return user;
}
