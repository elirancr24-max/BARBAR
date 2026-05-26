'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Trash2, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/layout/TopBar';
import { api } from '@/lib/api';

interface PrivacyStatus {
  dataExportRequestedAt: string | null;
  dataDeletionRequestedAt: string | null;
  dataDeletionApprovedAt: string | null;
  marketingConsent: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function MyPrivacyPage() {
  const qc = useQueryClient();
  const { data: status, isLoading } = useQuery({
    queryKey: ['my', 'privacy-status'],
    queryFn: async () => (await api.get<PrivacyStatus>('/customers/me/privacy-status')).data,
  });

  const exportMut = useMutation({
    mutationFn: async () => {
      const res = await api.post('/customers/me/data-export', undefined, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers['content-disposition'] as string | undefined;
      const match = cd?.match(/filename="?([^";]+)"?/);
      a.download = match?.[1] || 'my-data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success('הנתונים שלך הורדו בהצלחה');
      qc.invalidateQueries({ queryKey: ['my', 'privacy-status'] });
    },
    onError: () => toast.error('שגיאה בהורדת הנתונים'),
  });

  const deleteMut = useMutation({
    mutationFn: async () => (await api.post('/customers/me/data-deletion-request')).data,
    onSuccess: () => {
      toast.success('הבקשה נשלחה לבעל העסק');
      qc.invalidateQueries({ queryKey: ['my', 'privacy-status'] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string }, status?: number } };
      if (e?.response?.status === 409) toast.error(e.response?.data?.message || 'בקשה קיימת');
      else toast.error('שגיאה בשליחת הבקשה');
    },
  });

  const handleDelete = () => {
    const ok = window.confirm(
      'המחיקה תיכנס לתוקף תוך 30 יום אחרי אישור של בעל העסק. תוכן עבר ישמר לצרכי הנהלת חשבונות. להמשיך?',
    );
    if (ok) deleteMut.mutate();
  };

  const pendingDeletion = !!status?.dataDeletionRequestedAt && !status?.dataDeletionApprovedAt;

  return (
    <>
      <TopBar title="המידע שלי" />
      <div className="container max-w-3xl py-6 lg:py-10 px-4 pb-24 lg:pb-10 space-y-6">
        <h1 className="lg:hidden text-3xl font-bold mb-2">המידע שלי</h1>
        <p className="text-muted-foreground">
          על פי תיקון 13 לחוק הגנת הפרטיות, יש לך זכות לעיין במידע שאנו מחזיקים עליך ולבקש את מחיקתו.
        </p>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">ייצוא המידע שלי</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  הורד קובץ JSON המכיל את כל המידע שאנו שומרים עליך — פרטים אישיים, תורים, תשלומים, ביקורות וצילומים.
                </p>
                <Button
                  variant="gold"
                  onClick={() => exportMut.mutate()}
                  disabled={exportMut.isPending}
                >
                  {exportMut.isPending ? 'מכין קובץ…' : 'הורד את כל המידע שלי'}
                </Button>
                {isLoading ? null : status?.dataExportRequestedAt && (
                  <p className="text-xs text-muted-foreground mt-3">
                    ייצוא אחרון: {formatDate(status.dataExportRequestedAt)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">מחיקת חשבון</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  בקשת מחיקה תועבר לאישור בעל העסק. עד 30 יום, פרטי הקשר שלך יוסרו ולא ניתן יהיה לזהות אותך.
                  רשומות עבר חשבונאיות יישמרו לפי חוק.
                </p>
                {pendingDeletion ? (
                  <div className="rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-4 py-3 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    בקשת מחיקה ממתינה לאישור (מאז {formatDate(status?.dataDeletionRequestedAt ?? null)})
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMut.isPending}
                  >
                    {deleteMut.isPending ? 'שולח…' : 'בקש מחיקת חשבון'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
