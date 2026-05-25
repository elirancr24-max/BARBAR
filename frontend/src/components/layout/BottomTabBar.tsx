'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Scissors, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/', label: 'בית', icon: Home, exact: true },
  { href: '/book', label: 'קבע תור', icon: Calendar, primary: true },
  { href: '/my/appointments', label: 'התורים שלי', icon: Scissors },
  { href: '/login', label: 'כניסה', icon: User },
];

export function BottomTabBar() {
  const pathname = usePathname();

  // Hide on admin/barber/auth routes
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/barber') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/offline') ||
    pathname.startsWith('/booking')
  ) return null;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur-md ui-noselect"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="ניווט תחתון"
    >
      <div className="flex items-stretch justify-around h-16 px-2">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + '/');
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 min-w-0 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.primary ? (
                <div className={cn(
                  '-mt-6 w-12 h-12 rounded-full gold-gradient text-white flex items-center justify-center shadow-lg shadow-primary/30',
                  active && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-card',
                )}>
                  <Icon className="w-6 h-6" />
                </div>
              ) : (
                <Icon className={cn('w-5 h-5', active && 'scale-110')} />
              )}
              <span className="text-[10px] font-medium leading-none">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
