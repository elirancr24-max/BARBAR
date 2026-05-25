'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogOut } from 'lucide-react';
import { api, clearTokens } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { PhotoMark } from '@/components/brand/PhotoMark';
import { adminNav, barberNav, customerNav, type NavItem } from './navItems';

export function Sidebar({ role }: { role: 'ADMIN' | 'BARBER' | 'CUSTOMER' }) {
  const pathname = usePathname();
  const router = useRouter();
  const clear = useAuth((s) => s.clear);
  const user = useAuth((s) => s.user);

  // If admin is ALSO a barber (owner-barber like Bar), append a personal-barber section
  let nav: NavItem[];
  if (role === 'ADMIN') {
    nav = user?.employee
      ? [
          ...adminNav,
          { href: '/barber/calendar', label: 'היומן שלי', icon: barberNav[0].icon },
          { href: '/barber/availability', label: 'שעות זמינות', icon: barberNav[1].icon },
          { href: '/barber/messages', label: 'הודעות מוכנות', icon: barberNav[barberNav.length - 1].icon },
        ]
      : adminNav;
  } else if (role === 'BARBER') {
    nav = barberNav;
  } else {
    nav = customerNav;
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    clearTokens();
    disconnectSocket();
    clear();
    router.push('/login');
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 border-s bg-gradient-to-b from-card via-card to-secondary/40 backdrop-blur-sm shrink-0 relative">
      {/* Side gold accent stripe */}
      <div className="absolute start-0 inset-y-0 w-1 barber-accent opacity-40" />

      <div className="p-6 border-b">
        <Link href="/" className="flex items-center gap-3 group">
          <PhotoMark size="md" />
          <div className="flex flex-col leading-none">
            <span className="font-display font-black text-xl tracking-tight group-hover:text-primary transition-colors">בר אברג׳יל</span>
            <span className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mt-1">hair design</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {active && <span className="absolute end-0 inset-y-2 w-1 rounded-full bg-primary" />}
              <Icon className={cn('w-5 h-5 shrink-0', active && 'text-primary')} />
              <span className={cn(active && 'font-semibold')}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t bg-card/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center font-bold text-white text-sm shrink-0">
            {(user?.fullName || user?.email || '?').charAt(0)}
          </div>
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-medium truncate leading-tight">{user?.fullName || user?.email}</div>
            <div className="text-muted-foreground text-xs">{role === 'ADMIN' ? 'מנהל' : 'ספר'}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start hover:bg-destructive/10 hover:text-destructive" onClick={logout}>
          <LogOut className="w-4 h-4 ms-2" />
          התנתק
        </Button>
      </div>
    </aside>
  );
}
