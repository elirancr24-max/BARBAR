'use client';

import { useQuery } from '@tanstack/react-query';
import { Printer, QrCode } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

interface QrInfo {
  bookingUrl: string;
  businessName: string;
}

export default function AdminQrPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['qr-info'],
    queryFn: async () => (await api.get<QrInfo>('/qr-info')).data,
  });

  const qrSrc = data
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(data.bookingUrl)}`
    : '';

  return (
    <>
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .sidebar-print-hide, header, nav, aside { display: none !important; }
          .qr-print-area {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
            padding: 2rem !important;
          }
        }
      `}</style>

      <div className="sidebar-print-hide">
        <TopBar title="QR לתורים" subtitle="הדפס ותלה במספרה — לקוחות יסרקו ויזמינו תור" />
      </div>

      <div className="p-4 lg:p-6 page-enter max-w-3xl mx-auto">
        <div className="qr-print-area flex flex-col items-center text-center gap-6 py-8">
          {isLoading || !data ? (
            <Skeleton className="w-[400px] h-[400px] rounded-xl" />
          ) : (
            <>
              <h1 className="text-3xl md:text-5xl font-display font-black">
                סרוק כדי להזמין תור
              </h1>
              <div className="text-xl text-muted-foreground">{data.businessName}</div>
              <div className="bg-white p-4 rounded-2xl shadow-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc}
                  alt="QR code להזמנת תור"
                  width={400}
                  height={400}
                  className="block"
                />
              </div>
              <div dir="ltr" className="text-sm font-mono text-muted-foreground break-all max-w-md">
                {data.bookingUrl}
              </div>
              <Button
                variant="gold"
                size="lg"
                onClick={() => window.print()}
                className="print:hidden"
              >
                <Printer className="w-5 h-5 ms-2" />
                הדפס
              </Button>
              <div className="print:hidden text-xs text-muted-foreground flex items-center gap-1">
                <QrCode className="w-3 h-3" /> טיפ: הדפס בגודל גדול ותלה במקום בולט בעסק
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
