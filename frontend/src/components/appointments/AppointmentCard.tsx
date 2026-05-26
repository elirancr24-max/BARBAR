'use client';

import { ReactNode } from 'react';
import { Clock, Scissors, User as UserIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatAgorot, formatTime } from '@/lib/utils';

export interface AppointmentLike {
  id: string;
  startAt: string;
  endAt?: string;
  status: string;
  priceAgorot?: number;
  service: { name: string };
  employee?: { color?: string; user: { fullName: string } };
  payment?: { status?: string } | null;
  review?: { rating?: number } | null;
  recurringSeriesId?: string | null;
}

export const APPOINTMENT_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'ממתין', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  CONFIRMED: { label: 'אושר', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  COMPLETED: { label: 'הושלם', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  CANCELLED: { label: 'בוטל', color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
  NO_SHOW:   { label: 'לא הגיע', color: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' },
};

interface Props {
  appointment: AppointmentLike;
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function AppointmentCard({ appointment: a, actions, className, compact }: Props) {
  const status = APPOINTMENT_STATUS[a.status] || { label: a.status, color: 'bg-secondary text-foreground' };
  const date = new Date(a.startAt);
  const paid = a.payment?.status === 'PAID';
  const rating = a.review?.rating;
  const isSeries = !!a.recurringSeriesId;

  return (
    <Card className={cn('hover:shadow-md transition-all', a.status === 'CANCELLED' && 'opacity-50', className)}>
      <CardContent className={cn('flex items-center gap-3 flex-wrap', compact ? 'p-3' : 'p-4')}>
        <div className="text-center min-w-[60px]">
          <div className="text-xs text-muted-foreground tabular-nums">
            {date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
          </div>
          <div className="font-bold text-primary tabular-nums">{formatTime(a.startAt)}</div>
        </div>
        {a.employee?.color && (
          <div className="w-1 self-stretch rounded-full" style={{ background: a.employee.color }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium flex items-center gap-2 flex-wrap">
            <Scissors className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            {a.service.name}
            {isSeries && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300">
                🔁 סדרה
              </span>
            )}
            {paid && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                ₪ שולם
              </span>
            )}
            {typeof rating === 'number' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-700 dark:text-yellow-300">
                ⭐ {rating}
              </span>
            )}
          </div>
          {a.employee && (
            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
              <UserIcon className="w-3 h-3" />
              <span style={{ color: a.employee.color }}>{a.employee.user.fullName}</span>
              {a.endAt && (
                <>
                  <span className="opacity-50">·</span>
                  <Clock className="w-3 h-3" /> {formatTime(a.startAt)}-{formatTime(a.endAt)}
                </>
              )}
            </div>
          )}
        </div>
        <div className="text-end">
          {typeof a.priceAgorot === 'number' && (
            <div className="font-bold text-primary tabular-nums">{formatAgorot(a.priceAgorot)}</div>
          )}
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block', status.color)}>{status.label}</span>
        </div>
        {actions}
      </CardContent>
    </Card>
  );
}
