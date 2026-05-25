'use client';

import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, User as UserIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSkeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/utils';

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  service: { name: string; color: string };
  employee: { color: string; user: { fullName: string } };
  customer: { fullName: string; phone: string };
}

const statusColor: Record<string, string> = {
  PENDING: 'bg-slate-400',
  CONFIRMED: 'bg-emerald-500',
  COMPLETED: 'bg-blue-500',
  CANCELLED: 'bg-rose-500',
  NO_SHOW: 'bg-amber-500',
};

export function TodaySchedule() {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay); endOfDay.setDate(endOfDay.getDate() + 1);

  const { data: appts = [], isLoading } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: async () => {
      const { data } = await api.get<Appointment[]>('/appointments', {
        params: { from: startOfDay.toISOString(), to: endOfDay.toISOString() },
      });
      return data.filter((a) => a.status !== 'CANCELLED');
    },
    refetchInterval: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          התורים של היום
          <span className="ms-auto text-sm font-normal text-muted-foreground">{appts.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ListSkeleton count={3} />
        ) : appts.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="אין תורים היום"
            description="היום פנוי לחלוטין"
            className="border-0 shadow-none p-8"
          />
        ) : (
          <div className="space-y-2">
            {appts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className={`w-1 h-12 rounded-full ${statusColor[a.status] || 'bg-slate-400'}`} />
                <div className="text-center min-w-[60px]">
                  <div className="font-bold text-primary text-lg leading-none">{formatTime(a.startAt)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{formatTime(a.endAt)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{a.customer.fullName}</div>
                  <div className="text-sm text-muted-foreground truncate flex items-center gap-1">
                    {a.service.name}
                    <span className="text-muted-foreground/60">·</span>
                    <UserIcon className="w-3 h-3" />
                    {a.employee.user.fullName}
                  </div>
                </div>
                <a href={`tel:${a.customer.phone}`} className="text-xs text-muted-foreground hover:text-primary hidden sm:block">
                  {a.customer.phone}
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
