'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Star, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string;
  createdAt: string;
}

export function relativeHe(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'היום';
  const d = Math.floor(diff / day);
  if (d < 7) return `לפני ${d} ימים`;
  if (d < 30) return `לפני ${Math.floor(d / 7)} שבועות`;
  if (d < 365) return `לפני ${Math.floor(d / 30)} חודשים`;
  return `לפני ${Math.floor(d / 365)} שנים`;
}

export function StarRating({ value, interactive, onChange }: { value: number; interactive?: boolean; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(n)}
          className={cn(
            'transition-transform',
            interactive && 'hover:scale-110 active:scale-95 cursor-pointer p-0.5',
            !interactive && 'cursor-default',
          )}
          aria-label={`${n} כוכבים`}
        >
          <Star
            className={cn(
              'w-5 h-5 transition-colors',
              n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewCard({ r }: { r: Review }) {
  return (
    <Card className="p-5 h-full flex flex-col hover:shadow-lg transition-shadow">
      <StarRating value={r.rating} />
      {r.comment && (
        <p className="text-sm mt-3 flex-1 leading-relaxed text-foreground/90">&ldquo;{r.comment}&rdquo;</p>
      )}
      <div className="flex items-center justify-between mt-4 pt-3 border-t">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full gold-gradient text-white flex items-center justify-center text-sm font-bold shrink-0">
            {r.customerName.charAt(0)}
          </div>
          <span className="font-medium text-sm truncate">{r.customerName}</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{relativeHe(r.createdAt)}</span>
      </div>
    </Card>
  );
}

export function ReviewForm({ defaultCode, onSuccess }: { defaultCode: string; onSuccess: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState(defaultCode);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const mut = useMutation({
    mutationFn: async () =>
      (await api.post('/reviews', {
        appointmentCode: code.trim(),
        rating,
        comment: comment.trim() || undefined,
      })).data,
    onSuccess: () => {
      toast.success('תודה על הביקורת!');
      qc.invalidateQueries({ queryKey: ['reviews'] });
      setCode('');
      setComment('');
      setRating(5);
      onSuccess();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה בשליחה');
    },
  });

  return (
    <Card className="p-6 max-w-xl mx-auto border-primary/30">
      <h2 className="font-display font-bold text-2xl mb-1">השאר ביקורת</h2>
      <p className="text-sm text-muted-foreground mb-5">
        רק תורים שהושלמו זכאים לדירוג. הכנס את קוד האישור שקיבלת.
      </p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>קוד אישור</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="BB-XXXXXX"
            className="font-mono tracking-wider"
          />
        </div>
        <div className="space-y-2">
          <Label>דירוג</Label>
          <div className="flex items-center gap-2">
            <div className="scale-150 origin-start">
              <StarRating value={rating} interactive onChange={setRating} />
            </div>
            <span className="text-sm text-muted-foreground ms-3">{rating} מתוך 5</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label>הערה (לא חובה)</Label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="ספר לנו על החוויה שלך..."
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            maxLength={2000}
          />
        </div>
        <Button
          variant="gold"
          size="lg"
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !code.trim()}
          className="w-full"
        >
          <Send className="w-4 h-4 ms-2" />
          {mut.isPending ? 'שולח...' : 'שלח ביקורת'}
        </Button>
      </div>
    </Card>
  );
}
