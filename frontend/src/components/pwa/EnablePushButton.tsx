'use client';

import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushSubscribe } from '@/hooks/usePushSubscribe';

export function EnablePushButton({ className }: { className?: string }) {
  const { supported, permission, enabled, loading, enable } = usePushSubscribe();

  // Hide if not supported, permission already granted (and subscribed), or denied
  if (!supported) return null;
  if (permission === 'granted' && enabled) return null;

  if (permission === 'denied') {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <BellOff className="w-4 h-4 ml-1" />
        התראות חסומות
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() => void enable()}
      className={className}
    >
      <Bell className="w-4 h-4 ml-1" />
      {loading ? 'מפעיל…' : '🔔 הפעל התראות'}
    </Button>
  );
}
