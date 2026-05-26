'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { PhotoMark } from '@/components/brand/PhotoMark';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import { api, clearTokens } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { adminNav, customerNav, type NavItem } from './navItems';

interface Props {
  role: 'ADMIN' | 'BARBER' | 'CUSTOMER';
  title: string;
}

export function MobileNav({ role, title }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const clear = useAuth((s) => s.clear);
  const user = useAuth((s) => s.user);
  let nav: NavItem[];
  if (role === 'ADMIN' || role === 'BARBER') {
    nav = adminNav;
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
    <>
      <header className="lg:hidden h-14 border-b bg-card/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4">
        <Button variant="ghost" size="icon" aria-label="פתח תפריט" onClick={() => setOpen(true)}>
          <Menu className="w-6 h-6" />
        </Button>
        <h1 className="font-display font-bold text-lg">{title}</h1>
        <ThemeToggle />
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute end-0 top-0 bottom-0 w-72 bg-card border-s shadow-2xl animate-slide-up overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                <PhotoMark size="sm" />
                <div className="flex flex-col leading-none">
                  <span className="font-display font-black text-lg">בר אברג׳יל</span>
                  <span className="text-[8px] tracking-[0.25em] uppercase text-muted-foreground mt-0.5">hair design</span>
                </div>
              </Link>
              <Button variant="ghost" size="icon" aria-label="סגור" onClick={() => setOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="p-3 space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-colors',
                      active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-0 inset-x-0 p-4 border-t bg-card">
              {user && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center font-bold text-white text-sm">
                    {(user.fullName || user.email).charAt(0)}
                  </div>
                  <div className="text-sm flex-1 min-w-0">
                    <div className="font-medium truncate">{user.fullName || user.email}</div>
                    <div className="text-muted-foreground text-xs">{role === 'ADMIN' ? 'מנהל' : 'ספר'}</div>
                  </div>
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={logout}>
                <LogOut className="w-4 h-4 ms-2" /> התנתק
              </Button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
