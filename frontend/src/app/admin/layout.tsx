'use client';

import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';
import { usePrefetchAdmin } from '@/hooks/usePrefetchAdmin';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Scissors } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthGuard(['ADMIN']);
  useRealtimeAppointments();
  usePrefetchAdmin();

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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="ADMIN" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileNav role="ADMIN" title="ניהול" />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
