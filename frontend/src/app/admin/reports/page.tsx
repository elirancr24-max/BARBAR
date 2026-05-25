'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { DollarSign, TrendingUp, Calendar, ChevronLeft } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const { data: top } = useQuery({
    queryKey: ['top-barber'],
    queryFn: async () => (await api.get<{ ranking: { employeeId: string; name: string; count: number }[] }>('/reports/top-barber')).data,
  });

  return (
    <>
      <TopBar title="דוחות" subtitle="ניתוח ביצועים והכנסות" />
      <div className="p-4 lg:p-6 space-y-6 max-w-5xl page-enter">
        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/admin/reports/end-of-day">
            <Card className="hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg gold-gradient flex items-center justify-center text-white">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">דוח סוף יום</div>
                  <div className="text-xs text-muted-foreground">הכנסות · טיפים · אמצעי תשלום</div>
                </div>
                <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/dashboard">
            <Card className="hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">דשבורד</div>
                  <div className="text-xs text-muted-foreground">סקירה חודשית · KPIs</div>
                </div>
                <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/calendar">
            <Card className="hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">יומן</div>
                  <div className="text-xs text-muted-foreground">תורים יומיים</div>
                </div>
                <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Top barber */}
        <Card>
          <CardHeader><CardTitle>הספרים המובילים (30 ימים)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(top?.ranking || []).map((r, i) => (
                <div key={r.employeeId} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <span className="font-medium">{r.name}</span>
                  </div>
                  <div className="font-bold text-primary tabular-nums">{r.count} תורים</div>
                </div>
              ))}
              {!top?.ranking?.length && <div className="text-muted-foreground text-center py-6">אין נתונים עדיין</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
