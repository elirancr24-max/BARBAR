'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Gift, Sparkles, Minus, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  customerId: string;
  points: number;
}

const TARGET = 10;

export function LoyaltyCard({ customerId, points }: Props) {
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: async (newPoints: number) =>
      (await api.patch(`/customers/${customerId}`, { loyaltyPoints: Math.max(0, newPoints) })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer', customerId] }),
  });

  const eligible = points >= TARGET;

  function redeemFree() {
    if (!eligible) return;
    if (confirm(`לממש כרטיסיה? ניתן ${TARGET} נקודות בעבור תספורת חינם.`)) {
      update.mutate(points - TARGET, {
        onSuccess: () => toast.success('🎁 מומש! התספורת הבאה חינם'),
      });
    }
  }

  return (
    <Card className={cn('overflow-hidden', eligible && 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/20')}>
      <div className="p-5 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">כרטיסיית נאמנות</div>
              <div className="text-xs text-muted-foreground">10 ביקורים = תספורת חינם</div>
            </div>
          </div>
          {eligible && (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-400 text-amber-950 font-bold flex items-center gap-1 animate-pulse">
              <Sparkles className="w-3 h-3" /> ניתן לממש!
            </span>
          )}
        </div>

        {/* Punch grid */}
        <div className="grid grid-cols-5 gap-2 my-4">
          {Array.from({ length: TARGET }).map((_, i) => {
            const filled = i < points % TARGET || (i < TARGET && points >= TARGET);
            const isFreeStamp = i === TARGET - 1;
            return (
              <div
                key={i}
                className={cn(
                  'aspect-square rounded-lg border-2 flex items-center justify-center transition-all',
                  filled
                    ? (isFreeStamp ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-500 text-white' : 'bg-primary/20 border-primary text-primary')
                    : 'border-dashed border-muted-foreground/30 bg-background',
                )}
              >
                {filled ? (
                  isFreeStamp ? <Gift className="w-5 h-5" /> : '✓'
                ) : (
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>נקודות נוכחיות: <strong className="text-foreground tabular-nums">{points}</strong></span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => update.mutate(points - 1)}
              className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center transition-colors"
              aria-label="הפחת"
              disabled={points === 0}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => update.mutate(points + 1)}
              className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center transition-colors"
              aria-label="הוסף"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {eligible && (
          <Button variant="gold" className="w-full mt-3" onClick={redeemFree}>
            <Gift className="w-4 h-4 ms-2" />
            ממש — תספורת חינם!
          </Button>
        )}
      </div>
    </Card>
  );
}
