'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAgorot, formatTime, cn } from '@/lib/utils';

export interface TimelineItem {
  date: string;
  type: 'appointment' | 'payment' | 'review' | 'photo' | 'no_show';
  appointmentId: string;
  serviceName?: string;
  status?: string;
  amountAgorot?: number;
  tipAgorot?: number;
  rating?: number;
  comment?: string | null;
  photoUrl?: string;
  photoKind?: string;
}

const ICON: Record<TimelineItem['type'], string> = {
  appointment: '✂️',
  payment: '💰',
  review: '⭐',
  photo: '📸',
  no_show: '⚠️',
};

const TYPE_BG: Record<TimelineItem['type'], string> = {
  appointment: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  payment: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  review: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  photo: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  no_show: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

function monthLabel(d: Date): string {
  return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
}

function itemTitle(item: TimelineItem): string {
  switch (item.type) {
    case 'appointment': return item.serviceName ? `תור — ${item.serviceName}` : 'תור';
    case 'no_show': return `לא הגיע — ${item.serviceName ?? ''}`.trim();
    case 'payment': return `תשלום ${formatAgorot(item.amountAgorot ?? 0)}${item.tipAgorot ? ` · טיפ ${formatAgorot(item.tipAgorot)}` : ''}`;
    case 'review': return `ביקורת ${item.rating ?? ''}/5`;
    case 'photo': return `תמונה${item.photoKind ? ` (${item.photoKind})` : ''}`;
  }
}

interface Props { customerId: string }

export function CustomerTimeline({ customerId }: Props) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['customer-timeline', customerId],
    queryFn: async () => (await api.get<TimelineItem[]>(`/customers/${customerId}/timeline`)).data,
  });

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">אין עדיין פעילות</div>;
  }

  // Group by month-year
  const groups: { key: string; label: string; items: TimelineItem[] }[] = [];
  for (const it of items) {
    const d = new Date(it.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(it);
    else groups.push({ key, label: monthLabel(d), items: [it] });
  }

  return (
    <div className="space-y-6" dir="rtl">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{g.label}</div>
          <ol className="relative border-s-2 border-border ms-2 ps-4 space-y-3">
            {g.items.map((item, i) => {
              const d = new Date(item.date);
              return (
                <li key={`${item.appointmentId}-${item.type}-${i}`} className="relative">
                  <span
                    className={cn(
                      'absolute -start-7 top-0 w-6 h-6 rounded-full flex items-center justify-center text-sm ring-2 ring-background',
                      TYPE_BG[item.type],
                    )}
                  >
                    {ICON[item.type]}
                  </span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-medium">{itemTitle(item)}</span>
                    {item.status && item.type === 'appointment' && (
                      <span className="text-[10px] text-muted-foreground">· {item.status}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })} · {formatTime(d)}
                  </div>
                  {item.type === 'review' && item.comment && (
                    <div className="text-sm mt-1 text-muted-foreground italic">"{item.comment}"</div>
                  )}
                  {item.type === 'photo' && item.photoUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.photoUrl} alt={item.photoKind ?? 'photo'} className="mt-1 rounded-md max-h-24 border" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
