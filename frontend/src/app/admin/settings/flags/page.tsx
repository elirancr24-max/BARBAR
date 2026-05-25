'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';

interface Flag { key: string; enabled: boolean; description: string|null; }

export default function FlagsPage() {
  const qc = useQueryClient();
  const { data: flags = [] } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => (await api.get<Flag[]>('/feature-flags')).data,
  });

  const mut = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) =>
      (await api.patch(`/feature-flags/${key}`, { enabled })).data,
    onSuccess: () => {
      toast.success('Flag עודכן');
      qc.invalidateQueries({ queryKey: ['feature-flags'] });
    },
  });

  return (
    <>
      <TopBar title="Feature Flags" />
      <div className="p-6 space-y-3">
        {flags.map((f) => (
          <Card key={f.key}><CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="font-mono text-sm font-semibold">{f.key}</div>
              {f.description && <div className="text-sm text-muted-foreground">{f.description}</div>}
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={f.enabled}
                onChange={(e) => mut.mutate({ key: f.key, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:bg-primary after:absolute after:top-0.5 after:start-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[-1.5rem]" />
            </label>
          </CardContent></Card>
        ))}
      </div>
    </>
  );
}
