'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Cake, Crown, Clock, MessageCircle, Check } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface Segment {
  id: string;
  label: string;
  count: number;
}
interface PreviewItem {
  customerId: string;
  name: string;
  phone: string;
  url: string;
  message: string;
  lastVisit: string | null;
}

const ICONS: Record<string, typeof Megaphone> = {
  dormant60d: Clock,
  dormant90d: Clock,
  vip: Crown,
  birthday_month: Cake,
};

function defaultTemplate(segment: string): 'birthdayGreeting' | 'campaignReengage' {
  return segment === 'birthday_month' ? 'birthdayGreeting' : 'campaignReengage';
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function MarketingPage() {
  const qc = useQueryClient();
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: segData, isLoading: segLoading } = useQuery({
    queryKey: ['marketing', 'segments'],
    queryFn: async () => (await api.get<{ segments: Segment[] }>('/marketing/segments')).data,
  });

  const templateKind = selectedSegment ? defaultTemplate(selectedSegment) : 'campaignReengage';

  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ['marketing', 'preview', selectedSegment, templateKind],
    queryFn: async () =>
      (await api.post<{ items: PreviewItem[]; count: number }>('/marketing/preview', {
        segment: selectedSegment,
        templateKind,
      })).data,
    enabled: !!selectedSegment,
  });

  const items = useMemo(() => previewData?.items ?? [], [previewData]);

  const logSentMut = useMutation({
    mutationFn: async () => {
      const ids = items.filter((i) => selectedIds.has(i.customerId)).map((i) => i.customerId);
      return (await api.post<{ logged: number }>('/marketing/log-sent', { customerIds: ids, templateKind })).data;
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ['marketing'] });
    },
  });

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.customerId));

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => i.customerId)));
  }
  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function handleOpenWA(item: PreviewItem) {
    window.open(item.url, '_blank', 'noopener');
    const next = new Set(selectedIds);
    next.add(item.customerId);
    setSelectedIds(next);
  }

  return (
    <>
      <TopBar title="שיווק וקמפיינים" subtitle="קמפיינים ידניים בוואטסאפ + ימי הולדת" />
      <div className="p-4 lg:p-6 space-y-6 max-w-6xl page-enter">
        {/* Segment cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(segData?.segments ?? []).map((s) => {
            const Icon = ICONS[s.id] ?? Megaphone;
            const isActive = selectedSegment === s.id;
            return (
              <Card
                key={s.id}
                className={`cursor-pointer transition-all hover:shadow-md ${isActive ? 'border-primary shadow-md' : ''}`}
                onClick={() => {
                  setSelectedSegment(s.id);
                  setSelectedIds(new Set());
                }}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.label}</div>
                    <div className="text-2xl font-bold">{s.count}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {segLoading && <div className="text-sm text-muted-foreground col-span-full">טוען מקטעים…</div>}
        </div>

        {/* Preview */}
        {selectedSegment && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">
                {previewData?.count ?? 0} לקוחות במקטע — תבנית: {templateKind === 'birthdayGreeting' ? 'ברכת יום הולדת' : 'החזרת לקוחות'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {allSelected ? 'בטל הכל' : 'בחר הכל'}
                </Button>
                <Button
                  size="sm"
                  disabled={selectedIds.size === 0 || logSentMut.isPending}
                  onClick={() => logSentMut.mutate()}
                >
                  <Check className="w-4 h-4 ml-1" />
                  סמן כנשלח ({selectedIds.size})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {previewLoading ? (
                <div className="text-sm text-muted-foreground py-6 text-center">טוען…</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">אין לקוחות במקטע זה</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b">
                      <tr>
                        <th className="text-right py-2 px-2 w-10"></th>
                        <th className="text-right py-2 px-2">שם</th>
                        <th className="text-right py-2 px-2">טלפון</th>
                        <th className="text-right py-2 px-2">ביקור אחרון</th>
                        <th className="text-right py-2 px-2 w-32"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.customerId} className="border-b last:border-b-0 hover:bg-accent/30">
                          <td className="py-2 px-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.customerId)}
                              onChange={() => toggleOne(item.customerId)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="py-2 px-2 font-medium">{item.name}</td>
                          <td className="py-2 px-2 font-mono text-xs" dir="ltr">{item.phone}</td>
                          <td className="py-2 px-2 text-muted-foreground">{fmtDate(item.lastVisit)}</td>
                          <td className="py-2 px-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenWA(item)}
                              className="text-emerald-600 hover:bg-emerald-500/10"
                            >
                              <MessageCircle className="w-3.5 h-3.5 ml-1" />
                              פתח WA
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedSegment && (
          <div className="text-sm text-muted-foreground text-center py-12">
            בחר מקטע למעלה כדי לראות לקוחות + קישורי WhatsApp
          </div>
        )}
      </div>
    </>
  );
}
