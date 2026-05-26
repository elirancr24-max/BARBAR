'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileSpreadsheet, Download } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

interface Summary {
  from: string;
  to: string;
  taxStatus: 'OSEK_MURSHE' | 'OSEK_PATUR' | 'UNKNOWN';
  vatRate: number;
  count: number;
  totalGrossAgorot: number;
  totalTipAgorot: number;
  totalVatNis: number;
  totalNetNis: number;
  byMethod: Record<string, number>;
}

const methodLabels: Record<string, string> = {
  cash: 'מזומן',
  card: 'אשראי',
  bit: 'ביט',
  transfer: 'העברה',
  other: 'אחר',
  unknown: 'לא ידוע',
};

const taxStatusLabels: Record<string, string> = {
  OSEK_MURSHE: 'עוסק מורשה',
  OSEK_PATUR: 'עוסק פטור',
  UNKNOWN: 'לא הוגדר',
};

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

function fmtNis(agorot: number) {
  return `₪${(agorot / 100).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNisRaw(nis: number) {
  return `₪${nis.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AccountantReportsPage() {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['accountant-summary', from, to],
    queryFn: async () =>
      (
        await api.get<Summary>('/reports/accountant/summary', {
          params: { from, to },
        })
      ).data,
  });

  async function downloadCsv() {
    try {
      setDownloading(true);
      const res = await api.get('/reports/accountant/payments.csv', {
        params: { from, to },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-${from}-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('הורדה נכשלה');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <TopBar title="דוח רואה חשבון" subtitle="דוחות תשלומים לרו״ח (תואם תקן ישראלי)" />
      <div className="p-4 lg:p-6 space-y-6 max-w-5xl">
        {/* Range picker */}
        <Card>
          <CardContent className="p-5 flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="from">מתאריך</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to">עד תאריך</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex-1" />
            <Button onClick={downloadCsv} disabled={downloading}>
              <FileSpreadsheet className="w-4 h-4 ms-1" />
              {downloading ? 'מוריד...' : 'הורד CSV תשלומים'}
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        {isLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : !data ? null : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-5">
                  <div className="text-xs text-muted-foreground">סה״כ ברוטו</div>
                  <div className="text-2xl font-bold tabular-nums">{fmtNis(data.totalGrossAgorot)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="text-xs text-muted-foreground">סה״כ טיפים</div>
                  <div className="text-2xl font-bold tabular-nums">{fmtNis(data.totalTipAgorot)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="text-xs text-muted-foreground">מע״מ ({data.vatRate}%)</div>
                  <div className="text-2xl font-bold tabular-nums">
                    {data.taxStatus === 'OSEK_MURSHE' ? fmtNisRaw(data.totalVatNis) : 'פטור'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="text-xs text-muted-foreground">נטו</div>
                  <div className="text-2xl font-bold tabular-nums">{fmtNisRaw(data.totalNetNis)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">פרטי תקופה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">סטטוס מס</span>
                  <span className="font-medium">{taxStatusLabels[data.taxStatus]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">מספר תשלומים</span>
                  <span className="font-medium tabular-nums">{data.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">טווח</span>
                  <span className="font-medium">{from} – {to}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">פילוח לפי אמצעי תשלום</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data.byMethod).length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">אין נתונים</div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(data.byMethod).map(([m, amt]) => {
                      const pct = data.totalGrossAgorot ? (amt / data.totalGrossAgorot) * 100 : 0;
                      return (
                        <div key={m}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">{methodLabels[m] || m}</span>
                            <span className="text-sm font-semibold tabular-nums">
                              {fmtNis(amt)}{' '}
                              <span className="text-muted-foreground text-xs">({pct.toFixed(0)}%)</span>
                            </span>
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

            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Download className="w-3 h-3" /> ה־CSV כולל מספר קבלה רץ, מע״מ מחושב, סכום נטו, ופרטי לקוח/ספר — מתאים לייבוא לרו״ח.
            </div>
          </>
        )}
      </div>
    </>
  );
}
