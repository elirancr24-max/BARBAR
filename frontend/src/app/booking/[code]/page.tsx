'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  Clock,
  Scissors,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Download,
  MessageCircle,
  ArrowRight,
  Phone,
  MapPin,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PhotoMark } from '@/components/brand/PhotoMark';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { api } from '@/lib/api';
import { formatAgorot, formatDateHe, formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Booking {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  employeeName: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  priceAgorot: number;
  confirmationCode: string;
  depositRequired?: boolean;
  depositPaidAt?: string | null;
  depositBitLink?: string | null;
  depositAgorot?: number;
}

const statusMeta: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  PENDING: { label: 'ממתין לאישור', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400/40', icon: Clock },
  CONFIRMED: { label: 'אושר', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-400/40', icon: CheckCircle2 },
  COMPLETED: { label: 'הושלם', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-400/40', icon: CheckCircle2 },
  CANCELLED: { label: 'בוטל', color: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-400/40', icon: XCircle },
  NO_SHOW: { label: 'לא הגיע', color: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-400/40', icon: XCircle },
};

const WA_NUMBER = '972500000001';

function buildICS(b: Booking): string {
  const dt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const uid = `${b.confirmationCode}@bar-abargil`;
  const summary = `תור - ${b.serviceName}`;
  const description = `ספר: ${b.employeeName}\\nקוד אישור: ${b.confirmationCode}`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bar Abargil//Booking//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(b.startAt)}`,
    `DTEND:${dt(b.endAt)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'LOCATION:בניין העיגולים, אילת',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export default function PublicBookingPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const confirm = useConfirm();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['booking', code],
    queryFn: async () => (await api.get<Booking>(`/bookings/${code}`)).data,
    retry: false,
  });

  const cancelMut = useMutation({
    mutationFn: async () => (await api.delete(`/bookings/${code}`)).data,
    onSuccess: () => {
      toast.success('התור בוטל');
      refetch();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה בביטול');
    },
  });

  async function handleCancel() {
    const ok = await confirm({
      title: 'לבטל את התור?',
      description: 'הפעולה אינה ניתנת לביטול. הסלוט ישתחרר מיד.',
      confirmText: 'כן, בטל תור',
      cancelText: 'השאר',
      variant: 'destructive',
    });
    if (ok) cancelMut.mutate();
  }

  function handleAddToCalendar() {
    if (!data) return;
    const ics = buildICS(data);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bar-abargil-${data.confirmationCode}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleWhatsApp() {
    if (!data) return;
    const msg = encodeURIComponent(`שלום, אני ${data.customerName} עם תור (${data.confirmationCode}) ב-${formatDateHe(data.startAt)}.`);
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-secondary/30">
      {/* Header */}
      <header className="border-b backdrop-blur-md bg-background/80 sticky top-0 z-30">
        <div className="container max-w-3xl flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <PhotoMark size="sm" />
            <span className="font-display font-black text-lg group-hover:text-primary transition-colors">בר אברג׳יל</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container max-w-2xl py-8 px-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : isError || !data ? (
          <EmptyState
            icon={XCircle}
            title="הזמנה לא נמצאה"
            description={`לא הצלחנו למצוא הזמנה עם הקוד ${code}. ייתכן שהקוד שגוי או שההזמנה בוטלה.`}
            action={
              <Button asChild variant="gold">
                <Link href="/book"><ArrowRight className="w-4 h-4 ms-2" /> קבע תור חדש</Link>
              </Button>
            }
          />
        ) : (
          <BookingDetails
            data={data}
            onCancel={handleCancel}
            onAddToCalendar={handleAddToCalendar}
            onWhatsApp={handleWhatsApp}
            cancelLoading={cancelMut.isPending}
          />
        )}
      </div>
    </div>
  );
}

function BookingDetails({
  data,
  onCancel,
  onAddToCalendar,
  onWhatsApp,
  cancelLoading,
}: {
  data: Booking;
  onCancel: () => void;
  onAddToCalendar: () => void;
  onWhatsApp: () => void;
  cancelLoading: boolean;
}) {
  const meta = statusMeta[data.status];
  const StatusIcon = meta.icon;
  const canCancel = data.status === 'PENDING' || data.status === 'CONFIRMED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Gold hero */}
      <Card className="overflow-hidden border-0 shadow-2xl shadow-primary/20">
        <div className="relative gold-gradient text-white p-8 text-center">
          <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4), transparent 60%)' }} />
          <div className="relative">
            <div className="text-xs uppercase tracking-[0.3em] opacity-90 mb-2">קוד אישור</div>
            <div className="font-display font-black text-3xl sm:text-4xl tabular-nums tracking-wider mb-3">
              {data.confirmationCode}
            </div>
            <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/90 border', 'text-foreground')}>
              <StatusIcon className="w-3.5 h-3.5" />
              {meta.label}
            </span>
          </div>
        </div>
      </Card>

      {/* Details */}
      <Card className="p-6">
        <h2 className="font-display font-bold text-xl mb-4">פרטי התור</h2>
        <div className="space-y-3">
          <DetailRow icon={UserIcon} label="לקוח" value={data.customerName} />
          <DetailRow icon={Scissors} label="שירות" value={data.serviceName} />
          <DetailRow icon={UserIcon} label="ספר" value={data.employeeName} />
          <DetailRow icon={CalendarIcon} label="מועד" value={formatDateHe(data.startAt)} />
          <DetailRow icon={Clock} label="שעה" value={`${formatTime(data.startAt)} - ${formatTime(data.endAt)}`} />
          <div className="flex items-center justify-between py-2 border-t mt-3">
            <span className="text-muted-foreground text-sm">לתשלום</span>
            <span className="text-2xl font-bold text-primary font-display tabular-nums">{formatAgorot(data.priceAgorot)}</span>
          </div>
        </div>
      </Card>

      {/* Deposit required panel */}
      {data.depositRequired && !data.depositPaidAt && (
        <Card className="p-5 border-amber-400/60 bg-amber-50 dark:bg-amber-950/20 space-y-3">
          <h3 className="font-display font-bold text-lg text-amber-800 dark:text-amber-300">
            נדרש פיקדון לאישור התור
          </h3>
          <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
            {data.depositAgorot
              ? `נא להעביר פיקדון של ${formatAgorot(data.depositAgorot)} לאישור התור.`
              : 'נא להעביר פיקדון לאישור התור.'}
          </p>
          {data.depositBitLink ? (
            <a
              href={data.depositBitLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full h-12 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center"
            >
              שלם ב-Bit
            </a>
          ) : (
            <p className="text-xs text-amber-800/70 dark:text-amber-200/70">
              נא ליצור קשר עם המספרה לתשלום הפיקדון.
            </p>
          )}
        </Card>
      )}

      {/* Actions */}
      <Card className="p-5 space-y-2">
        <Button onClick={onAddToCalendar} variant="outline" className="w-full h-12 justify-start">
          <Download className="w-5 h-5 ms-2" />
          הוסף ליומן (Google / Apple)
        </Button>
        <Button onClick={onWhatsApp} variant="outline" className="w-full h-12 justify-start">
          <MessageCircle className="w-5 h-5 ms-2 text-emerald-600" />
          שלח הודעה ב-WhatsApp
        </Button>
        {canCancel && (
          <Button
            onClick={onCancel}
            variant="destructive"
            disabled={cancelLoading}
            className="w-full h-12 justify-start"
          >
            <XCircle className="w-5 h-5 ms-2" />
            {cancelLoading ? 'מבטל...' : 'בטל את התור'}
          </Button>
        )}
      </Card>

      {/* Footer info */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">המספרה</h3>
        <div className="space-y-2 text-sm">
          <a href="tel:+972500000001" className="flex items-center gap-2 hover:text-primary transition-colors">
            <Phone className="w-4 h-4 text-primary/70" />
            050-000-0001
          </a>
          <a
            href="https://maps.google.com/?q=בניין+העיגולים+אילת"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <MapPin className="w-4 h-4 text-primary/70" />
            בניין העיגולים, אילת
          </a>
        </div>
      </Card>

      <div className="text-center pt-2">
        <Button asChild variant="ghost">
          <Link href="/">חזרה לדף הבית</Link>
        </Button>
      </div>
    </motion.div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-secondary/70 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium truncate">{value}</div>
      </div>
    </div>
  );
}
