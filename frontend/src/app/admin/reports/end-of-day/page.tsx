'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Banknote, CreditCard, Smartphone, ArrowRightLeft, MoreHorizontal, Printer, FileSpreadsheet, DollarSign, CheckCircle2, XCircle, UserX, Calendar, Users } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api';
import { formatAgorot, formatTime, cn } from '@/lib/utils';

interface Row {
  id: string;
  time: string;
  customer: string;
  phone: string;
  service: string;
  barber: string;
  status: string;
  paid: boolean;
  amount: number;
  tip: number;
  method: string | null;
}

interface BarberRow { name: string; revenue: number; tips: number; count: number; }

interface Report {
  date: string;
  totalAppointments: number;
  byStatus: Record<string, number>;
  totalRevenueAgorot: number;
  totalTipsAgorot: number;
  byMethod: Record<string, number>;
  byBarber: BarberRow[];
  appointments: Row[];
}

const methodIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  cash: Banknote, card: CreditCard, bit: Smartphone, transfer: ArrowRightLeft, other: MoreHorizontal,
};
const methodLabels: Record<string, string> = {
  cash: 'מזומן', card: 'אשראי', bit: 'ביט', transfer: 'העברה', other: 'אחר',
};
const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'ממתין', color: 'bg-slate-500/15 text-slate-600' },
  CONFIRMED: { label: 'אושר', color: 'bg-emerald-500/15 text-emerald-600' },
  COMPLETED: { label: 'הושלם', color: 'bg-blue-500/15 text-blue-600' },
  CANCELLED: { label: 'בוטל', color: 'bg-rose-500/15 text-rose-600' },
  NO_SHOW: { label: 'לא הגיע', color: 'bg-amber-500/15 text-amber-600' },
};

export default function EndOfDayPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ['end-of-day', date],
    queryFn: async () => (await api.get<Report>('/reports/end-of-day', { params: { date } })).data,
  });

  function exportCSV() {
    if (!data) return;
    const rows = [['שעה', 'לקוח', 'טלפון', 'שירות', 'ספר', 'סטטוס', 'שולם', 'סכום', 'טיפ', 'אמצעי']];
    for (const r of data.appointments) {
      rows.push([
        formatTime(r.time), r.customer, r.phone, r.service, r.barber,
        statusLabels[r.status]?.label || r.status,
        r.paid ? 'כן' : 'לא',
        (r.amount / 100).toFixed(2),
        (r.tip / 100).toFixed(2),
        r.method ? methodLabels[r.method] : '',
      ]);
    }
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eod-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const completed = data?.byStatus['COMPLETED'] || 0;
  const cancelled = data?.byStatus['CANCELLED'] || 0;
  const noShow = data?.byStatus['NO_SHOW'] || 0;

  return (
    <>
      <TopBar title="דוח סוף יום" subtitle="סיכום יומי של הכנסות, תורים וטיפים" />
      <div className="p-4 lg:p-6 space-y-6 page-enter max-w-5xl">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer className="w-4 h-4 ms-1" /> הדפסה
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="print:hidden">
            <FileSpreadsheet className="w-4 h-4 ms-1" /> CSV
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : !data ? null : (
          <>
            {/* Totals */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="overflow-hidden">
                <div className="p-5 gold-gradient text-white">
                  <DollarSign className="w-5 h-5 mb-2 opacity-90" />
                  <div className="text-3xl font-display font-black tabular-nums">{formatAgorot(data.totalRevenueAgorot)}</div>
                  <div className="text-xs opacity-90 mt-1">הכנסה</div>
                </div>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="text-2xl mb-2">💸</div>
                  <div className="text-2xl font-bold tabular-nums">{formatAgorot(data.totalTipsAgorot)}</div>
                  <div className="text-xs text-muted-foreground mt-1">טיפים</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <Calendar className="w-5 h-5 text-blue-500 mb-2" />
                  <div className="text-2xl font-bold tabular-nums">{data.totalAppointments}</div>
                  <div className="text-xs text-muted-foreground mt-1">תורים</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
                  <div className="text-2xl font-bold tabular-nums">{completed}</div>
                  <div className="text-xs text-muted-foreground mt-1">הושלמו</div>
                </CardContent>
              </Card>
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By method */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">פילוח לפי אמצעי תשלום</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(data.byMethod).length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">לא נרשמו תשלומים</div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(data.byMethod).map(([m, amount]) => {
                        const Icon = methodIcons[m] || MoreHorizontal;
                        const pct = data.totalRevenueAgorot ? (amount / data.totalRevenueAgorot) * 100 : 0;
                        return (
                          <div key={m}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                                {methodLabels[m] || m}
                              </div>
                              <div className="text-sm font-semibold tabular-nums">{formatAgorot(amount)} <span className="text-muted-foreground text-xs">({pct.toFixed(0)}%)</span></div>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* By barber */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> פילוח לפי ספר</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.byBarber.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">אין נתונים</div>
                  ) : (
                    <div className="space-y-3">
                      {data.byBarber.map((b) => (
                        <div key={b.name} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg">
                          <div>
                            <div className="font-medium">{b.name}</div>
                            <div className="text-xs text-muted-foreground">{b.count} תורים · טיפ {formatAgorot(b.tips)}</div>
                          </div>
                          <div className="text-end">
                            <div className="font-bold text-primary text-lg tabular-nums">{formatAgorot(b.revenue)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Status breakdown chips */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.byStatus).map(([s, n]) => (
                <span key={s} className={cn('text-xs font-medium px-3 py-1 rounded-full', statusLabels[s]?.color || 'bg-secondary')}>
                  {statusLabels[s]?.label || s}: {n}
                </span>
              ))}
            </div>

            {/* Full table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">כל התורים</CardTitle>
              </CardHeader>
              <CardContent>
                {data.appointments.length === 0 ? (
                  <EmptyState icon={Calendar} title="אין תורים ביום זה" description="" className="border-0 shadow-none" />
                ) : (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground uppercase border-b">
                          <th className="text-start py-2 pe-3">שעה</th>
                          <th className="text-start py-2 pe-3">לקוח</th>
                          <th className="text-start py-2 pe-3">שירות</th>
                          <th className="text-start py-2 pe-3">ספר</th>
                          <th className="text-start py-2 pe-3">סטטוס</th>
                          <th className="text-end py-2 ps-3">סכום</th>
                          <th className="text-end py-2 ps-3">טיפ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.appointments.map((r) => (
                          <tr key={r.id} className="hover:bg-accent/30">
                            <td className="py-2.5 pe-3 font-mono tabular-nums">{formatTime(r.time)}</td>
                            <td className="py-2.5 pe-3 font-medium">{r.customer}</td>
                            <td className="py-2.5 pe-3 text-muted-foreground">{r.service}</td>
                            <td className="py-2.5 pe-3">{r.barber}</td>
                            <td className="py-2.5 pe-3">
                              <span className={cn('text-[10px] px-2 py-0.5 rounded-full', statusLabels[r.status]?.color)}>
                                {statusLabels[r.status]?.label || r.status}
                              </span>
                            </td>
                            <td className="py-2.5 ps-3 text-end font-semibold tabular-nums">
                              {r.paid ? formatAgorot(r.amount) : <span className="text-muted-foreground">{formatAgorot(r.amount)}</span>}
                            </td>
                            <td className="py-2.5 ps-3 text-end tabular-nums text-muted-foreground">
                              {r.tip > 0 ? formatAgorot(r.tip) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
