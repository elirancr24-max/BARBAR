'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldAlert, Check, X, Download, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { TopBar } from '@/components/layout/TopBar';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { api } from '@/lib/api';

interface PrivacyRequest {
  customerId: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  type: 'export' | 'deletion' | 'both';
  requestedAt: string;
  ageDays: number;
}

function ageBadgeClasses(days: number, isDeletion: boolean): string {
  if (!isDeletion) return 'bg-muted text-muted-foreground';
  if (days <= 7) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (days <= 25) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
  return 'bg-red-500/15 text-red-700 dark:text-red-300';
}

function rowAccentClasses(days: number, isDeletion: boolean): string {
  if (!isDeletion) return '';
  if (days <= 7) return 'border-emerald-500/30';
  if (days <= 25) return 'border-amber-500/40';
  return 'border-red-500/50 bg-red-500/5';
}

function typeLabel(t: PrivacyRequest['type']): string {
  switch (t) {
    case 'export':
      return 'ייצוא נתונים';
    case 'deletion':
      return 'מחיקת חשבון';
    case 'both':
      return 'ייצוא + מחיקה';
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function AdminPrivacyRequestsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['privacy-requests'],
    queryFn: async () => (await api.get<PrivacyRequest[]>('/privacy-requests')).data,
  });

  const approveMut = useMutation({
    mutationFn: async (customerId: string) =>
      (await api.post(`/privacy-requests/${customerId}/approve-deletion`)).data,
    onSuccess: () => {
      toast.success('המחיקה בוצעה — נתונים אישיים אנונימיזציה');
      qc.invalidateQueries({ queryKey: ['privacy-requests'] });
    },
    onError: () => toast.error('שגיאה באישור המחיקה'),
  });

  const rejectMut = useMutation({
    mutationFn: async ({ customerId, reason }: { customerId: string; reason: string }) =>
      (await api.post(`/privacy-requests/${customerId}/reject-deletion`, { reason })).data,
    onSuccess: () => {
      toast.success('הבקשה נדחתה');
      qc.invalidateQueries({ queryKey: ['privacy-requests'] });
    },
    onError: () => toast.error('שגיאה בדחיית הבקשה'),
  });

  const handleApprove = async (r: PrivacyRequest) => {
    const ok = await confirm({
      title: 'לאשר מחיקת חשבון?',
      description: `הפרטים האישיים של ${r.fullName} יוסרו לצמיתות. רשומות עבר חשבונאיות יישמרו.`,
      confirmText: 'כן, מחק',
      variant: 'destructive',
    });
    if (ok) approveMut.mutate(r.customerId);
  };

  const handleReject = (r: PrivacyRequest) => {
    const reason = window.prompt(`סיבה לדחיית בקשת המחיקה של ${r.fullName}:`);
    if (reason && reason.trim()) {
      rejectMut.mutate({ customerId: r.customerId, reason: reason.trim() });
    }
  };

  return (
    <>
      <TopBar title="בקשות פרטיות" subtitle="ניהול בקשות עיון ומחיקה (תיקון 13)" />
      <div className="p-4 lg:p-6 space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            <ListSkeleton count={3} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="אין בקשות פתוחות"
            description="כל בקשות העיון והמחיקה טופלו"
          />
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const isDeletion = r.type === 'deletion' || r.type === 'both';
              return (
                <Card key={r.customerId} className={cn('border-2', rowAccentClasses(r.ageDays, isDeletion))}>
                  <CardContent className="p-4 lg:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold truncate">{r.fullName}</span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded',
                            ageBadgeClasses(r.ageDays, isDeletion),
                          )}
                        >
                          {r.ageDays}d
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.phone} · {r.email}
                      </div>
                      <div className="text-sm mt-2 flex items-center gap-2">
                        {r.type === 'export' && <Download className="w-4 h-4 text-muted-foreground" />}
                        {r.type === 'deletion' && <Trash2 className="w-4 h-4 text-destructive" />}
                        {r.type === 'both' && (
                          <>
                            <Download className="w-4 h-4 text-muted-foreground" />
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </>
                        )}
                        <span>{typeLabel(r.type)}</span>
                        <span className="text-muted-foreground"> · {formatDate(r.requestedAt)}</span>
                      </div>
                    </div>
                    {isDeletion && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleApprove(r)}
                          disabled={approveMut.isPending}
                        >
                          <Check className="w-4 h-4 ms-1" /> אשר מחיקה
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(r)}
                          disabled={rejectMut.isPending}
                        >
                          <X className="w-4 h-4 ms-1" /> דחה
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
