'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { MessageSquare, Save, RotateCcw, Power, Info } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TemplateItem {
  key: string;
  label: string;
  description: string;
  toCustomer: boolean;
  enabled: boolean;
  template: string;
  defaultTemplate: string;
  isCustomized: boolean;
}

const VARIABLES = [
  { token: '{customerName}', label: 'שם הלקוח' },
  { token: '{customerPhone}', label: 'טלפון הלקוח' },
  { token: '{serviceName}', label: 'שירות' },
  { token: '{employeeName}', label: 'שם הספר' },
  { token: '{dateTime}', label: 'תאריך ושעה' },
  { token: '{businessName}', label: 'שם העסק' },
];

export default function BarberMessagesPage() {
  const qc = useQueryClient();
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-templates'],
    queryFn: async () => (await api.get<{ templates: TemplateItem[] }>('/employees/me/templates')).data,
    retry: 1,
  });

  useEffect(() => {
    if (data?.templates && data.templates.length > 0 && items.length === 0) {
      setItems(data.templates);
      setActiveKey((cur) => cur ?? data.templates[0]?.key ?? null);
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, { enabled: boolean; template: string }> = {};
      for (const t of items) {
        payload[t.key] = { enabled: t.enabled, template: t.template };
      }
      return api.put('/employees/me/templates', { templates: payload });
    },
    onSuccess: () => {
      toast.success('הודעות נשמרו ✅');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['my-templates'] });
    },
    onError: () => toast.error('שגיאה בשמירה'),
  });

  const active = items.find((i) => i.key === activeKey);

  function updateActive(patch: Partial<TemplateItem>) {
    if (!active) return;
    setItems((prev) => prev.map((p) => (p.key === active.key ? { ...p, ...patch } : p)));
    setDirty(true);
  }

  function resetToDefault() {
    if (!active) return;
    updateActive({ template: active.defaultTemplate });
  }

  function insertVariable(token: string) {
    if (!active) return;
    updateActive({ template: active.template + ' ' + token });
  }

  return (
    <>
      <TopBar title="הודעות מוכנות" />
      <div className="p-4 lg:p-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <MessageSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">הודעות וואטסאפ אוטומטיות</p>
                <p className="text-muted-foreground">
                  הגדר את ההודעות שיישלחו ללקוחות שלך (אישור / ביטול / שינוי / תזכורת) ואת ההודעה שתישלח אליך כשלקוח קובע תור חדש.
                  אפשר לערוך כל הודעה, לכבות אותה, או להחזיר למקור.
                </p>
              </div>
            </div>
          </motion.div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">טוען...</div>
          ) : error ? (
            <Card className="p-6 text-center">
              <p className="text-destructive font-medium mb-2">שגיאה בטעינת ההודעות</p>
              <p className="text-sm text-muted-foreground mb-4">{(error as Error).message}</p>
              <Button variant="outline" onClick={() => refetch()}>נסה שוב</Button>
            </Card>
          ) : items.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-3">לא נטענו הודעות. נסה לרענן.</p>
              <Button variant="outline" onClick={() => refetch()}>טען מחדש</Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-[260px_1fr] gap-4">
              {/* Sidebar: list of templates */}
              <div className="space-y-2">
                {items.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveKey(t.key)}
                    className={cn(
                      'w-full text-start p-3 rounded-xl border-2 transition-all',
                      activeKey === t.key
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30',
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{t.label}</span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          t.enabled ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {t.enabled ? 'פעיל' : 'כבוי'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                    {!t.toCustomer && (
                      <span className="text-[10px] text-primary font-medium mt-1 inline-block">← אליך</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Editor */}
              {active && (
                <Card className="p-5">
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h2 className="text-xl font-bold">{active.label}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{active.description}</p>
                    </div>
                    <Button
                      variant={active.enabled ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => updateActive({ enabled: !active.enabled })}
                    >
                      <Power className="w-4 h-4 ms-1.5" />
                      {active.enabled ? 'כבה הודעה' : 'הפעל הודעה'}
                    </Button>
                  </div>

                  <div className="mb-3">
                    <Label className="mb-2 block">תוכן ההודעה</Label>
                    <textarea
                      value={active.template}
                      onChange={(e) => updateActive({ template: e.target.value })}
                      disabled={!active.enabled}
                      rows={10}
                      maxLength={2000}
                      dir="auto"
                      className={cn(
                        'w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono leading-relaxed',
                        !active.enabled && 'opacity-50',
                      )}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{active.template.length} / 2000</span>
                      {active.isCustomized && (
                        <Button variant="ghost" size="sm" onClick={resetToDefault} className="h-7 text-xs">
                          <RotateCcw className="w-3 h-3 ms-1" />
                          החזר ברירת מחדל
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <Label className="mb-2 block flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      משתנים זמינים — לחץ כדי להוסיף
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {VARIABLES.map((v) => (
                        <button
                          key={v.token}
                          type="button"
                          disabled={!active.enabled}
                          onClick={() => insertVariable(v.token)}
                          className="text-xs px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-50 font-mono"
                          title={v.label}
                        >
                          {v.token}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="border-t pt-4 mt-4">
                    <Label className="mb-2 block">תצוגה מקדימה</Label>
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/40 p-4">
                      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">
                        {previewMessage(active.template)}
                      </pre>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-background/95 backdrop-blur-md border-t shadow-lg lg:start-64">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">יש שינויים שלא נשמרו</span>
            <Button variant="gold" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              <Save className="w-4 h-4 ms-1.5" />
              {saveMut.isPending ? 'שומר...' : 'שמור הודעות'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function previewMessage(template: string): string {
  const sample = {
    '{customerName}': 'דני כהן',
    '{customerPhone}': '050-1234567',
    '{serviceName}': 'תספורת + זקן',
    '{employeeName}': 'בר',
    '{dateTime}': 'יום שלישי, 28/05/2026, 14:30',
    '{businessName}': 'בר אברג׳יל',
    '{notes}': '',
  };
  let out = template;
  for (const [k, v] of Object.entries(sample)) {
    out = out.split(k).join(v);
  }
  return out;
}
