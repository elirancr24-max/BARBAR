import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'ADMIN' | 'BARBER' | 'CUSTOMER';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role: Role;
  employee?: { id: string; color: string } | null;
  customer?: { id: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),
      clear: () => set({ user: null }),
    }),
    { name: 'barbar-auth' },
  ),
);
