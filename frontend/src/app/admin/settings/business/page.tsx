'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Clock } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface BusinessSettings {
  slotIntervalMin?: number;
  depositRequired?: boolean;
  depositAgorot?: number;
  commissionPercent?: number;
  // …other fields, kept open-ended
  [k: string]: unknown;
}

const INTERVAL_OPTIONS: number[] = [15, 20, 30];

export default function BusinessSettingsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => (await api.get<BusinessSettings>('/business-settings')).data,
  });

  const [slotIntervalMin, setSlotIntervalMin] = useState<number>(20);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setSlotIntervalMin(data.slotIntervalMin ?? 20);
      setDirty(false);
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () =>
      api.put('/business-settings', { slotIntervalMin }),
    onSuccess: () => {
      toast.success('הגדרות נשמרו ✅');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['business-settings'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה בשמירה');
    },
  });

  return (
    <>
      <TopBar title="הגדרות עסק" subtitle="הגדרות כלליות של המספרה" />
      <div className="p-4 lg:p-6 max-w-3xl pb-24 lg:pb-6 space-y-4">
        {isLoading ? (
          <Card className="h-32 animate-pulse" />
        ) : (
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">מרווח תורים בלוח</h2>
                <p className="text-xs text-muted-foreground">המרווח בין סלוטים אפשריים שמוצגים ללקוח בעת קביעת תור</p>
              </div>
            </div>

            <Label className="mb-2 block">בחר מרווח</Label>
            <div className="grid grid-cols-3 gap-3">
              {INTERVAL_OPTIONS.map((n) => {
                const active = slotIntervalMin === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => { setSlotIntervalMin(n); setDirty(true); }}
                    className={cn(
                      'p-4 rounded-xl border-2 text-center transition-all',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input hover:border-primary/40',
                    )}
                  >
                    <div className="text-2xl font-bold">{n}</div>
                    <div className="text-xs text-muted-foreground">דקות</div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                variant="gold"
                disabled={!dirty || saveMut.isPending}
                onClick={() => saveMut.mutate()}
              >
                <Save className="w-4 h-4 ms-2" />
                {saveMut.isPending ? 'שומר...' : 'שמור'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
