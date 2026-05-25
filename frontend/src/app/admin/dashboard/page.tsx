'use client';

import { useQuery } from '@tanstack/react-query';
import { Calendar, DollarSign, Users, XCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TopBar } from '@/components/layout/TopBar';
import { TodaySchedule } from '@/components/dashboard/TodaySchedule';
import { NextAppointment } from '@/components/dashboard/NextAppointment';
import { BirthdaysWidget } from '@/components/dashboard/BirthdaysWidget';
import { api } from '@/lib/api';
import { formatAgorot } from '@/lib/utils';

interface DashboardData {
  todayAppointments: number;
  monthRevenueAgorot: number;
  cancelledLast30: number;
  totalCustomers: number;
  repeatingCustomers: number;
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

  return (
    <>
      <TopBar title="דשבורד" subtitle="סקירה של היום והחודש" />
      <div className="p-4 lg:p-6 space-y-6 page-enter">
        <NextAppointment />

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
