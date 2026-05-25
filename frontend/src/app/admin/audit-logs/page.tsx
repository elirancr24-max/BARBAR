'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDateHe } from '@/lib/utils';

interface Log {
  id: string;
  action: string;
  entityType: string;
  entityId: string|null;
  actor: { fullName: string; email: string } | null;
  actorRole: string|null;
  before: unknown;
  after: unknown;
  ip: string|null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');

  const { data } = useQuery({
    queryKey: ['audit-logs', action, entityType],
    queryFn: async () => (await api.get<{ data: Log[]; meta: { total: number } }>('/audit-logs', {
      params: { action: action || undefined, entityType: entityType || undefined, limit: 50 },
    })).data,
  });

  return (
    <>
      <TopBar title="לוגים (Audit Logs)" />
      <div className="p-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Input placeholder="פעולה (למשל appointment.update)" value={action} onChange={(e) => setAction(e.target.value)} className="max-w-xs" />
          <Input placeholder="סוג ישות (Appointment)" value={entityType} onChange={(e) => setEntityType(e.target.value)} className="max-w-xs" />
        </div>

        <div className="space-y-2">
          {(data?.data || []).map((log) => (
            <Card key={log.id}><CardContent className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
              <div className="text-sm text-muted-foreground">{formatDateHe(log.createdAt)}</div>
              <div className="font-medium">{log.action}</div>
              <div className="text-sm">{log.entityType}</div>
              <div className="text-sm text-muted-foreground truncate">{log.actor?.fullName || 'system'}</div>
              <div className="text-xs text-muted-foreground">{log.actorRole}</div>
              <div className="text-xs text-muted-foreground truncate">{log.entityId}</div>
            </CardContent></Card>
          ))}
          {!data?.data?.length && <div className="text-muted-foreground text-center py-12">אין לוגים</div>}
        </div>
      </div>
    </>
  );
}
