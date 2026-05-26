'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/utils';

interface Row {
  id: string;
  time: string;
  customer: string;
  phone: string;
  service: string;
  barber: string;
  status: string;
}

interface Report {
  date: string;
  totalAppointments: number;
  appointments: Row[];
}

interface BizSettings {
  businessName?: string;
}

const statusLabels: Record<string, string> = {
  PENDING: 'ממתין',
  CONFIRMED: 'אושר',
  COMPLETED: 'הושלם',
  CANCELLED: 'בוטל',
  NO_SHOW: 'לא הגיע',
};

function formatHebDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function CalendarPrintPage() {
  const sp = useSearchParams();
  const date = sp.get('date') || new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['eod-print', date],
    queryFn: async () => (await api.get<Report>('/reports/end-of-day', { params: { date } })).data,
  });

  const { data: biz } = useQuery({
    queryKey: ['business-settings-public-print'],
    queryFn: async () => {
      try {
        return (await api.get<BizSettings>('/business-settings')).data;
      } catch {
        return { businessName: 'BarBar' } as BizSettings;
      }
    },
  });

  const sorted = [...(data?.appointments || [])].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );

  return (
    <>
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          header, nav, aside, .print-hide { display: none !important; }
          .print-page { padding: 0 !important; max-width: none !important; }
          .print-row { page-break-inside: avoid; }
          table { font-size: 12pt; }
        }
        @page { size: A4; margin: 1.2cm; }
      `}</style>

      <div className="print-page p-6 max-w-5xl mx-auto bg-white text-black min-h-screen">
        <div className="flex items-center justify-between mb-6 print-hide">
          <h1 className="text-xl font-bold">תצוגת הדפסה — יומן יומי</h1>
          <Button variant="gold" onClick={() => window.print()}>
            <Printer className="w-4 h-4 ms-2" /> הדפס
          </Button>
        </div>

        <div className="border-b-2 border-black pb-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-display font-black">
                {biz?.businessName || 'BarBar'}
              </div>
              <div className="text-base text-gray-700">{formatHebDate(date)}</div>
            </div>
            <div className="text-end text-sm">
              <div>תאריך: {date}</div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10">טוען...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-10 text-gray-600">אין תורים ביום זה</div>
        ) : (
          <table className="w-full border-collapse text-base">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-start py-2 px-2">שעה</th>
                <th className="text-start py-2 px-2">לקוח</th>
                <th className="text-start py-2 px-2">טלפון</th>
                <th className="text-start py-2 px-2">שירות</th>
                <th className="text-start py-2 px-2">ספר</th>
                <th className="text-start py-2 px-2">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-b border-gray-300 print-row">
                  <td className="py-2 px-2 font-mono tabular-nums whitespace-nowrap">{formatTime(r.time)}</td>
                  <td className="py-2 px-2 font-medium">{r.customer}</td>
                  <td className="py-2 px-2 font-mono tabular-nums" dir="ltr">{r.phone}</td>
                  <td className="py-2 px-2">{r.service}</td>
                  <td className="py-2 px-2">{r.barber}</td>
                  <td className="py-2 px-2">{statusLabels[r.status] || r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-6 pt-3 border-t-2 border-black text-base font-semibold">
          סה&quot;כ {sorted.length} תורים
        </div>
      </div>
    </>
  );
}
