'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

type State =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string }
  | { kind: 'confirm'; customerName: string; alreadyOptedOut: boolean }
  | { kind: 'submitting' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div dir="rtl" lang="he" style={{ padding: 24, textAlign: 'center' }}>טוען…</div>}>
      <UnsubscribeInner />
    </Suspense>
  );
}

function UnsubscribeInner() {
  const search = useSearchParams();
  const token = search.get('t') || '';
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ kind: 'invalid', message: 'קישור לא תקין — חסר טוקן' });
      return;
    }
    api
      .get('/unsubscribe', { params: { t: token } })
      .then((res) => {
        if (cancelled) return;
        setState({
          kind: 'confirm',
          customerName: res.data?.customerName || '',
          alreadyOptedOut: !!res.data?.alreadyOptedOut,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err?.response?.data?.error === 'not_found'
            ? 'הלקוח לא נמצא'
            : 'הקישור לא תקין או פג תוקפו';
        setState({ kind: 'invalid', message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleUnsubscribe = async () => {
    setState({ kind: 'submitting' });
    try {
      await api.post('/unsubscribe', { t: token });
      setState({ kind: 'done' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setState({
        kind: 'error',
        message:
          e?.response?.data?.error === 'invalid_token'
            ? 'הקישור לא תקין'
            : 'שגיאה בעת הסרת הרישום — נסה שוב',
      });
    }
  };

  return (
    <main
      dir="rtl"
      lang="he"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#f9fafb',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: 'white',
          padding: '32px 28px',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 16, color: '#111827' }}>
          הסרה מרשימת תפוצה
        </h1>

        {state.kind === 'loading' && (
          <p style={{ color: '#6b7280' }}>טוען…</p>
        )}

        {state.kind === 'invalid' && (
          <p style={{ color: '#dc2626' }}>{state.message}</p>
        )}

        {state.kind === 'confirm' && state.alreadyOptedOut && (
          <p style={{ color: '#374151', fontSize: 16 }}>
            שלום {state.customerName}, אתה כבר לא ברשימת התפוצה השיווקית שלנו.
          </p>
        )}

        {state.kind === 'confirm' && !state.alreadyOptedOut && (
          <>
            <p style={{ color: '#374151', fontSize: 16, marginBottom: 24 }}>
              שלום {state.customerName}, האם להסיר אותך מרשימת התפוצה השיווקית?
            </p>
            <button
              type="button"
              onClick={handleUnsubscribe}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '14px 28px',
                borderRadius: 8,
                fontSize: 17,
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              כן, הסר אותי
            </button>
          </>
        )}

        {state.kind === 'submitting' && (
          <p style={{ color: '#6b7280' }}>מסיר…</p>
        )}

        {state.kind === 'done' && (
          <p style={{ color: '#059669', fontSize: 16 }}>
            ✅ הוסרת מרשימת התפוצה. לא תקבל יותר הודעות שיווקיות.
          </p>
        )}

        {state.kind === 'error' && (
          <p style={{ color: '#dc2626' }}>{state.message}</p>
        )}
      </div>
    </main>
  );
}
