'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import { Calendar, Clock, Scissors, User as UserIcon, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api';
import { formatAgorot, formatDateHe } from '@/lib/utils';

interface Appointment {
  id: string;
  startAt: string;
  status: string;
  priceAgorot: number;
  service: { name: string };
  employee: { user: { fullName: string } };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'ממתין לאישור', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  CONFIRMED: { label: 'אושר', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  COMPLETED: { label: 'הושלם', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
  CANCELLED: { label: 'בוטל', color: 'bg-rose-500/15 text-rose-700 dark:text-rose-400' },
  NO_SHOW: { label: 'לא הגיע', color: 'bg-orange-500/15 text-orange-700 dark:text-orange-400' },
};

export default function MyAppointmentsPage() {
  const qc = useQueryClient();
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
              <Card key={a.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-wrap justify-between items-start mb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Scissors className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-lg">{a.service.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserIcon className="w-4 h-4" />
                        {a.employee.user.fullName}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusLabels[a.status].color}`}>{statusLabels[a.status].label}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between pt-3 border-t gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {formatDateHe(a.startAt)}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary text-lg">{formatAgorot(a.priceAgorot)}</span>
                      <Button variant="ghost" size="sm" onClick={() => confirm('לבטל תור?') && cancelMut.mutate(a.id)}>
                        <X className="w-4 h-4 ms-1" /> בטל
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">היסטוריה</h2>
          <div className="space-y-2">
            {past.slice(0, 10).map((a) => (
              <Card key={a.id} className="opacity-70 hover:opacity-100 transition-opacity">
                <CardContent className="p-4 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <div className="font-medium">{a.service.name}</div>
                    <div className="text-sm text-muted-foreground">{formatDateHe(a.startAt)}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusLabels[a.status].color}`}>{statusLabels[a.status].label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
