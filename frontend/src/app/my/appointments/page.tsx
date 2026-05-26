'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import { Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { api } from '@/lib/api';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Appointment {
  id: string;
  startAt: string;
  endAt?: string;
  status: string;
  priceAgorot: number;
  service: { name: string };
  employee: { user: { fullName: string } };
  payment?: { status?: string } | null;
  review?: { rating?: number } | null;
  recurringSeriesId?: string | null;
}

export default function MyAppointmentsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: appts = [], isLoading } = useQuery({
    queryKey: ['appointments', 'mine'],
    queryFn: async () => (await api.get<Appointment[]>('/appointments')).data,
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/appointments/${id}`)).data,
    onSuccess: () => {
      toast.success('התור בוטל');
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const upcoming = appts.filter(a => new Date(a.startAt) >= new Date() && a.status !== 'CANCELLED');
  const past = appts.filter(a => new Date(a.startAt) < new Date() || a.status === 'CANCELLED');

  return (
    <div className="container max-w-3xl py-6 lg:py-10 px-4 pb-24 lg:pb-10">
      <h1 className="text-3xl font-bold mb-2">התורים שלי</h1>
      <p className="text-muted-foreground mb-8">ניהול ההזמנות שלך</p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          תורים קרובים
          <span className="bg-primary/10 text-primary text-sm px-2 py-0.5 rounded-full">{upcoming.length}</span>
        </h2>
        {isLoading ? (
          <ListSkeleton count={2} />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="אין תורים קרובים"
            description="קבע תור עכשיו וקבל את הסטייל הטוב ביותר"
            action={<Button variant="gold" size="lg" asChild><Link href="/book">קבע תור עכשיו</Link></Button>}
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <AppointmentCard
                key={a.id}
                appointment={a}
                actions={
                  <Button variant="ghost" size="sm" onClick={async () => {
                    const ok = await confirm({ title: 'לבטל תור?', description: 'התור יבוטל והסלוט ישתחרר.', confirmText: 'כן, בטל', variant: 'destructive' });
                    if (ok) cancelMut.mutate(a.id);
                  }}>
                    <X className="w-4 h-4 ms-1" /> בטל
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">היסטוריה</h2>
          <div className="space-y-2">
            {past.slice(0, 10).map((a) => (
              <AppointmentCard key={a.id} appointment={a} compact className="opacity-70 hover:opacity-100 transition-opacity" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
