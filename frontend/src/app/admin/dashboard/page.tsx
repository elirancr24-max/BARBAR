'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Calendar, DollarSign, XCircle, TrendingUp, ArrowUp, ArrowDown, Phone, Crown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TopBar } from '@/components/layout/TopBar';
import { TodaySchedule } from '@/components/dashboard/TodaySchedule';
import { NextAppointment } from '@/components/dashboard/NextAppointment';
import { BirthdaysWidget } from '@/components/dashboard/BirthdaysWidget';
import { EnablePushButton } from '@/components/pwa/EnablePushButton';
import { api } from '@/lib/api';
import { formatAgorot, cn } from '@/lib/utils';

interface DashboardData {
  todayAppointments: number;
  monthRevenueAgorot: number;
  cancelledLast30: number;
  totalCustomers: number;
  repeatingCustomers: number;
  nextAppointment?: {
    id: string; time: string; customerName: string; customerPhone: string; serviceName: string; minutesUntil: number;
  } | null;
  weekRevenue?: number;
  lastWeekRevenue?: number;
  weekRevenueDelta?: number;
  topCustomers?: { userId: string; customerId?: string | null; fullName: string; totalAgorot: number; visits: number }[];
}

function minutesText(min: number): string {
  if (min <= 0) return 'עכשיו';
  if (min < 60) return `בעוד ${min} דקות`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem ? `בעוד ${h}:${String(rem).padStart(2, '0')} שעות` : `בעוד ${h} שעות`;
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<DashboardData>('/reports/dashboard')).data,
    refetchInterval: 30_000,
  });
  const { data: revenue } = useQuery({
    queryKey: ['revenue'],
    queryFn: async () => (await api.get<{ series: { date: string; amountAgorot: number }[] }>('/reports/revenue')).data,
  });
  const { data: busy } = useQuery({
    queryKey: ['busy-hours'],
    queryFn: async () => (await api.get<{ buckets: { hour: number; count: number }[] }>('/reports/busy-hours')).data,
  });

  const kpis = [
    { label: 'תורים היום', value: data?.todayAppointments ?? 0, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'הכנסה החודש', value: data ? formatAgorot(data.monthRevenueAgorot) : '—', icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'לקוחות חוזרים', value: data?.repeatingCustomers ?? 0, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'ביטולים (30 ימים)', value: data?.cancelledLast30 ?? 0, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  const nextAppt = data?.nextAppointment;
  const weekDelta = data?.weekRevenueDelta ?? 0;
  const weekRevenue = data?.weekRevenue ?? 0;
  const topCustomers = data?.topCustomers ?? [];

  return (
    <>
      <TopBar title="דשבורד" subtitle="סקירה של היום והחודש" />
      <div className="p-4 lg:p-6 space-y-6 page-enter">
        <div className="flex justify-end">
          <EnablePushButton />
        </div>
        {/* Next appointment hero — backend-driven, business-wide */}
        {nextAppt ? (
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="gold-gradient text-white p-5 relative">
              <div className="absolute -end-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
              <div className="relative flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-widest opacity-90 mb-1">⏰ התור הבא</div>
                  <h2 className="font-display text-2xl lg:text-3xl font-bold leading-tight truncate">{nextAppt.customerName}</h2>
                  <div className="text-sm opacity-95 mt-1">{nextAppt.serviceName}</div>
                </div>
                <div className="text-end">
                  <div className="font-display text-3xl lg:text-4xl font-black tabular-nums leading-none">
                    {new Date(nextAppt.time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs opacity-90 mt-1">{minutesText(nextAppt.minutesUntil)}</div>
                </div>
              </div>
              <div className="relative flex gap-2 mt-4 pt-4 border-t border-white/20">
                <a href={`tel:${nextAppt.customerPhone}`} className="flex-1 h-10 rounded-md bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center gap-1.5 text-sm font-medium transition-colors">
                  <Phone className="w-3.5 h-3.5" /> חייג ל-{nextAppt.customerName}
                </a>
              </div>
            </div>
          </Card>
        ) : (
          <NextAppointment />
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {kpis.map((k) => (
            <Card key={k.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 lg:p-6">
                <div className={`w-10 h-10 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-3`}>
                  <k.icon className="w-5 h-5" />
                </div>
                <div className="text-xs lg:text-sm text-muted-foreground mb-1">{k.label}</div>
                {isLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-xl lg:text-2xl font-bold">{k.value}</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Week vs last week + Top customers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="text-xs text-muted-foreground mb-1">השבוע מול שבוע שעבר</div>
              <div className="text-2xl font-bold tabular-nums">{formatAgorot(weekRevenue)}</div>
              <div className={cn('mt-2 inline-flex items-center gap-1 text-sm font-medium', weekDelta >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {weekDelta >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {weekDelta >= 0 ? '+' : ''}{weekDelta}%
                <span className="text-xs text-muted-foreground">vs {formatAgorot(data?.lastWeekRevenue ?? 0)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" /> לקוחות מובילים (90 ימים)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topCustomers.length === 0 ? (
                <div className="text-sm text-muted-foreground">אין נתונים עדיין</div>
              ) : (
                <ol className="space-y-1.5">
                  {topCustomers.map((c, i) => (
                    <li key={c.userId} className="flex items-center gap-3 text-sm">
                      <span className="w-6 text-center font-bold text-muted-foreground tabular-nums">{i + 1}</span>
                      {c.customerId ? (
                        <Link href={`/admin/customers/${c.customerId}`} className="flex-1 truncate hover:text-primary">
                          {c.fullName}
                        </Link>
                      ) : (
                        <span className="flex-1 truncate">{c.fullName}</span>
                      )}
                      <span className="text-xs text-muted-foreground tabular-nums">{c.visits} תורים</span>
                      <span className="font-bold text-primary tabular-nums">{formatAgorot(c.totalAgorot)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today schedule */}
          <div className="lg:col-span-2">
            <TodaySchedule />
          </div>

          {/* Quick stats sidebar */}
          <div className="space-y-6">
            <BirthdaysWidget />
            <Card>
              <CardHeader>
                <CardTitle>סטטוס מהיר</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <Row label="סה״כ לקוחות" value={data?.totalCustomers ?? 0} />
                  <Row label="לקוחות חוזרים" value={data?.repeatingCustomers ?? 0} />
                  <Row label="ביטולים (30 ימים)" value={data?.cancelledLast30 ?? 0} highlight={(data?.cancelledLast30 ?? 0) > 5} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>הכנסות 30 ימים אחרונים</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={(revenue?.series ?? []).map((p) => ({ ...p, amount: p.amountAgorot / 100 }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                  <YAxis />
                  <Tooltip formatter={(v) => `₪${v}`} labelFormatter={(d) => d} />
                  <Line type="monotone" dataKey="amount" stroke="#c9a961" strokeWidth={2.5} dot={{ r: 3, fill: '#c9a961' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>שעות עמוסות</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={busy?.buckets ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                  <YAxis />
                  <Tooltip formatter={(v) => `${v} תורים`} labelFormatter={(h) => `שעה ${h}:00`} />
                  <Bar dataKey="count" fill="#c9a961" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? 'font-bold text-rose-500' : 'font-semibold'}>{value}</span>
    </div>
  );
}
