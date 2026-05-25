'use client';

import Link from 'next/link';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Scissors } from 'lucide-react';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthGuard();
  useRealtimeAppointments();
  const clear = useAuth((s) => s.clear);
  const router = useRouter();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-lg gold-gradient flex items-center justify-center animate-pulse">
          <Scissors className="w-6 h-6 text-white" />
        </div>
        <span className="text-muted-foreground text-sm">טוען...</span>
      </div>
    );
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    clear();
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <header className="border-b backdrop-blur-md bg-background/80 sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2.5 font-display font-black text-lg">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-full gold-gradient p-[2px]">
                <div className="w-full h-full rounded-full overflow-hidden bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.jpg" alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            <span className="hidden sm:inline">בר אברג׳יל</span>
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex"><Link href="/my/appointments">התורים שלי</Link></Button>
            <Button variant="gold" size="sm" asChild><Link href="/book">קבע תור</Link></Button>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex">התנתק</Button>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
