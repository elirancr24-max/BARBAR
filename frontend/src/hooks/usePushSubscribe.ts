'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

const LS_KEY = 'barbar-push-enabled';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = typeof window !== 'undefined' ? window.atob(base64) : '';
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export interface UsePushSubscribeResult {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  enabled: boolean;
  loading: boolean;
  error: string | null;
  enable: () => Promise<boolean>;
}

export function usePushSubscribe(): UsePushSubscribeResult {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'unsupported',
  );
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ok =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (ok) {
      setPermission(Notification.permission);
      setEnabled(localStorage.getItem(LS_KEY) === '1' && Notification.permission === 'granted');
    }
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('הדפדפן לא תומך בהתראות');
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('הרשאת התראות לא אושרה');
        return false;
      }

      const reg = await navigator.serviceWorker.ready;

      const { data } = await api.get<{ key: string | null }>('/push/vapid-public-key');
      if (!data.key) {
        setError('המערכת אינה מוגדרת לשליחת התראות');
        return false;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const appServerKey = urlBase64ToUint8Array(data.key);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // Cast: BufferSource shape mismatch across TS lib versions
          applicationServerKey: appServerKey.buffer as ArrayBuffer,
        });
      }

      const json = sub.toJSON();
      await api.post('/push/subscribe', {
        endpoint: sub.endpoint,
        keys: {
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
      });

      localStorage.setItem(LS_KEY, '1');
      setEnabled(true);
      return true;
    } catch (err) {
      console.error('Push subscribe failed', err);
      setError('שגיאה בהפעלת התראות');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, enabled, loading, error, enable };
}
