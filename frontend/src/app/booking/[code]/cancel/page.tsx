'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, XCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function SelfCancelPage() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const code = params.code;
  const token = search.get('t') ?? '';
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const cancelMut = useMutation({
    mutationFn: async () =>
      (await api.post(`/bookings/${code}/cancel-with-token`, { token })).data,
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setErrMsg(err.response?.data?.error?.message || 'שגיאה בביטול התור');
    },
  });

  const isMissingToken = !token;
  const done = cancelMut.isSuccess;
  const failed = cancelMut.isError;

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30" dir="rtl">
      <Card className="max-w-md w-full p-6 space-y-4 text-center">
        {isMissingToken ? (
          <>
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h1 className="font-display font-bold text-xl">קישור לא תקין</h1>
            <p className="text-sm text-muted-foreground">
              חסר טוקן ביטול בקישור. אם קיבלת קישור ביטול בהודעה, ודא שהעתקת אותו במלואו.
            </p>
            <Button asChild variant="outline">
              <Link href={`/booking/${code}`}>
                <ArrowRight className="w-4 h-4 ms-2" /> חזרה לפרטי התור
              </Link>
            </Button>
          </>
        ) : done ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h1 className="font-display font-bold text-xl">התור בוטל</h1>
            <p className="text-sm text-muted-foreground">
              הביטול נקלט בהצלחה. תודה שהודעת לנו מבעוד מועד.
            </p>
            <Button asChild variant="gold">
              <Link href="/book">קבע תור חדש</Link>
            </Button>
          </>
        ) : failed ? (
          <>
            <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h1 className="font-display font-bold text-xl">לא הצלחנו לבטל</h1>
            <p className="text-sm text-rose-600">{errMsg}</p>
            <Button asChild variant="outline">
              <Link href={`/booking/${code}`}>
                <ArrowRight className="w-4 h-4 ms-2" /> חזרה לפרטי התור
              </Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="font-display font-bold text-xl">לבטל את התור?</h1>
            <p className="text-sm text-muted-foreground">
              לחיצה על "בטל תור" תבטל את ההזמנה ותשחרר את הסלוט באופן מיידי.
            </p>
            <div className="flex gap-2 justify-center">
              <Button asChild variant="ghost">
                <Link href={`/booking/${code}`}>חזור</Link>
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelMut.mutate()}
                disabled={cancelMut.isPending}
              >
                {cancelMut.isPending ? 'מבטל...' : 'בטל תור'}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
