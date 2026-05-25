'use client';

import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/store/auth';

export function TopBar({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  return (
    <header className="hidden lg:flex h-20 border-b bg-card/40 backdrop-blur-sm items-center justify-between px-8 sticky top-0 z-20">
      <div>
        <h1 className="font-display text-3xl font-bold leading-none">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {action}
        <span className="text-sm text-muted-foreground hidden md:inline">שלום, {user?.fullName?.split(' ')[0]}</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
