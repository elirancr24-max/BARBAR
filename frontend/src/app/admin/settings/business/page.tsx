'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

interface BusinessSettings {
  id: string;
  businessName: string;
  businessAddress: string | null;
  businessTaxId: string | null;
  taxStatus: 'OSEK_MURSHE' | 'OSEK_PATUR' | 'UNKNOWN';
  vatRate: number;
  requireDeposit: boolean;
  depositAgorot: number;
  depositMethod: 'BIT_LINK' | 'TRANZILA' | 'BOTH';
  bitPhone: string | null;
  noShowThreshold: number;
  autoReminder24h: boolean;
  allowSelfCancel: boolean;
  selfCancelCutoffHr: number;
  defaultCommissionPct: number;
  slotIntervalMin: number;
  businessPhone: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  aboutStory: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  mapEmbedUrl: string | null;
  businessHours: string | null;
  accessibilityOfficerName: string | null;
  accessibilityOfficerPhone: string | null;
  accessibilityOfficerEmail: string | null;
  accessibilityStatementText: string | null;
}

type FormValues = Omit<BusinessSettings, 'id'>;

export default function BusinessSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => (await api.get<BusinessSettings>('/business-settings')).data,
  });

  const { register, handleSubmit, reset, watch } = useForm<FormValues>();

  useEffect(() => {
    if (data) {
      reset({
        businessName: data.businessName,
        businessAddress: data.businessAddress ?? '',
        businessTaxId: data.businessTaxId ?? '',
        taxStatus: data.taxStatus,
        vatRate: data.vatRate,
        requireDeposit: data.requireDeposit,
        depositAgorot: data.depositAgorot,
        depositMethod: data.depositMethod,
        bitPhone: data.bitPhone ?? '',
        noShowThreshold: data.noShowThreshold,
        autoReminder24h: data.autoReminder24h,
        allowSelfCancel: data.allowSelfCancel,
        selfCancelCutoffHr: data.selfCancelCutoffHr,
        defaultCommissionPct: data.defaultCommissionPct,
        slotIntervalMin: data.slotIntervalMin ?? 30,
        businessPhone: data.businessPhone ?? '',
        heroTitle: data.heroTitle ?? '',
        heroSubtitle: data.heroSubtitle ?? '',
        aboutStory: data.aboutStory ?? '',
        instagramUrl: data.instagramUrl ?? '',
        facebookUrl: data.facebookUrl ?? '',
        mapEmbedUrl: data.mapEmbedUrl ?? '',
        businessHours: data.businessHours ?? '',
        accessibilityOfficerName: data.accessibilityOfficerName ?? '',
        accessibilityOfficerPhone: data.accessibilityOfficerPhone ?? '',
        accessibilityOfficerEmail: data.accessibilityOfficerEmail ?? '',
        accessibilityStatementText: data.accessibilityStatementText ?? '',
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        businessName: values.businessName,
        businessAddress: values.businessAddress || null,
        businessTaxId: values.businessTaxId || null,
        taxStatus: values.taxStatus,
        vatRate: Number(values.vatRate),
        requireDeposit: !!values.requireDeposit,
        depositAgorot: Number(values.depositAgorot),
        depositMethod: values.depositMethod,
        bitPhone: values.bitPhone || null,
        noShowThreshold: Number(values.noShowThreshold),
        autoReminder24h: !!values.autoReminder24h,
        allowSelfCancel: !!values.allowSelfCancel,
        selfCancelCutoffHr: Number(values.selfCancelCutoffHr),
        defaultCommissionPct: Number(values.defaultCommissionPct),
        slotIntervalMin: Number(values.slotIntervalMin),
        businessPhone: values.businessPhone || null,
        heroTitle: values.heroTitle || null,
        heroSubtitle: values.heroSubtitle || null,
        aboutStory: values.aboutStory || null,
        instagramUrl: values.instagramUrl || null,
        facebookUrl: values.facebookUrl || null,
        mapEmbedUrl: values.mapEmbedUrl || null,
        businessHours: values.businessHours || null,
        accessibilityOfficerName: values.accessibilityOfficerName || null,
        accessibilityOfficerPhone: values.accessibilityOfficerPhone || null,
        accessibilityOfficerEmail: values.accessibilityOfficerEmail || null,
        accessibilityStatementText: values.accessibilityStatementText || null,
      };
      return (await api.put<BusinessSettings>('/business-settings', payload)).data;
    },
    onSuccess: () => {
      toast.success('הגדרות עודכנו');
      qc.invalidateQueries({ queryKey: ['business-settings'] });
    },
    onError: () => toast.error('שמירה נכשלה'),
  });

  if (isLoading) {
    return (
      <>
        <TopBar title="הגדרות עסק" />
        <div className="p-6">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </>
    );
  }

  const requireDeposit = watch('requireDeposit');
  const slotIntervalMin = watch('slotIntervalMin');

  return (
    <>
      <TopBar title="הגדרות עסק" subtitle="פרטי העסק, פיקדונות, תזכורות ועמלות" />
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="p-4 lg:p-6 space-y-6 max-w-3xl"
      >
        {/* Slot interval */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">מרווח תורים בלוח</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              קובע את הצעדים שבהם מוצגים סלוטים פנויים בלוח ובדף ההזמנה.
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {[15, 20, 30].map((n) => {
                const active = slotIntervalMin === n;
                return (
                  <label
                    key={n}
                    className={`flex items-center justify-center h-12 rounded-md border cursor-pointer text-sm font-medium ${
                      active ? 'border-primary bg-primary/10 text-primary' : 'border-input'
                    }`}
                  >
                    <input
                      type="radio"
                      value={n}
                      {...register('slotIntervalMin', { valueAsNumber: true })}
                      className="sr-only"
                    />
                    {n} דקות
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Business details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">פרטי העסק</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="businessName">שם העסק</Label>
              <Input id="businessName" {...register('businessName')} />
            </div>
            <div>
              <Label htmlFor="businessAddress">כתובת</Label>
              <Input id="businessAddress" {...register('businessAddress')} />
            </div>
            <div>
              <Label htmlFor="businessTaxId">ח.פ / ע.מ</Label>
              <Input id="businessTaxId" {...register('businessTaxId')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxStatus">סטטוס מס</Label>
                <select
                  id="taxStatus"
                  {...register('taxStatus')}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                >
                  <option value="UNKNOWN">לא הוגדר</option>
                  <option value="OSEK_PATUR">עוסק פטור</option>
                  <option value="OSEK_MURSHE">עוסק מורשה</option>
                </select>
              </div>
              <div>
                <Label htmlFor="vatRate">שיעור מע״מ (%)</Label>
                <Input
                  id="vatRate"
                  type="number"
                  min={0}
                  max={100}
                  {...register('vatRate', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deposits & cancellations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">פיקדונות וביטולים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('requireDeposit')}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium">דרוש פיקדון לתורים</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="depositAgorot">סכום פיקדון (אגורות)</Label>
                <Input
                  id="depositAgorot"
                  type="number"
                  min={0}
                  disabled={!requireDeposit}
                  {...register('depositAgorot', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="depositMethod">אמצעי פיקדון</Label>
                <select
                  id="depositMethod"
                  {...register('depositMethod')}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                >
                  <option value="BIT_LINK">קישור ביט</option>
                  <option value="TRANZILA">תרנזילה (אשראי)</option>
                  <option value="BOTH">שניהם</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="bitPhone">מספר טלפון לביט</Label>
              <Input id="bitPhone" {...register('bitPhone')} placeholder="05X-XXXXXXX" />
            </div>
            <div>
              <Label htmlFor="noShowThreshold">סף אי-הגעות שמחייב פיקדון</Label>
              <Input
                id="noShowThreshold"
                type="number"
                min={0}
                {...register('noShowThreshold', { valueAsNumber: true })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">תזכורות וביטול עצמי</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('autoReminder24h')} className="w-5 h-5" />
              <span className="text-sm font-medium">שליחת תזכורת אוטומטית 24 שעות לפני</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('allowSelfCancel')} className="w-5 h-5" />
              <span className="text-sm font-medium">לאפשר ללקוח לבטל תור באופן עצמאי</span>
            </label>
            <div>
              <Label htmlFor="selfCancelCutoffHr">חסימת ביטול עצמי (שעות לפני התור)</Label>
              <Input
                id="selfCancelCutoffHr"
                type="number"
                min={0}
                {...register('selfCancelCutoffHr', { valueAsNumber: true })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Commissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">עמלות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="defaultCommissionPct">אחוז עמלה ברירת מחדל לספר (%)</Label>
              <Input
                id="defaultCommissionPct"
                type="number"
                min={0}
                max={100}
                {...register('defaultCommissionPct', { valueAsNumber: true })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Mini-site content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">תוכן האתר</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              עורך את הטקסטים והקישורים שמופיעים בדף הבית ובדף האודות של האתר הציבורי.
            </p>
            <div>
              <Label htmlFor="heroTitle">כותרת ראשית</Label>
              <Input id="heroTitle" {...register('heroTitle')} placeholder="בר אברג׳יל" />
            </div>
            <div>
              <Label htmlFor="heroSubtitle">תת-כותרת</Label>
              <Input id="heroSubtitle" {...register('heroSubtitle')} placeholder="תספורת · עיצוב · סטייל" />
            </div>
            <div>
              <Label htmlFor="aboutStory">סיפור על העסק</Label>
              <textarea
                id="aboutStory"
                rows={6}
                {...register('aboutStory')}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base resize-y"
                placeholder="ספר ללקוחות על העסק, הסיפור, הערכים..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="businessPhone">טלפון תצוגה באתר</Label>
                <Input id="businessPhone" {...register('businessPhone')} placeholder="050-000-0001" />
              </div>
              <div>
                <Label htmlFor="businessHours">שעות פעילות לאתר</Label>
                <Input id="businessHours" {...register('businessHours')} placeholder="א׳–ה׳ 10:00–20:00" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="instagramUrl">אינסטגרם</Label>
                <Input id="instagramUrl" type="url" {...register('instagramUrl')} placeholder="https://www.instagram.com/..." />
              </div>
              <div>
                <Label htmlFor="facebookUrl">פייסבוק</Label>
                <Input id="facebookUrl" type="url" {...register('facebookUrl')} placeholder="https://www.facebook.com/..." />
              </div>
            </div>
            <div>
              <Label htmlFor="mapEmbedUrl">קוד הטמעת מפה</Label>
              <Input id="mapEmbedUrl" type="url" {...register('mapEmbedUrl')} placeholder="https://maps.google.com/maps?..." />
              <p className="text-xs text-muted-foreground mt-1">
                הדבק כאן את ה-src של iframe ממפות גוגל (הקישור שבתוך iframe src=&quot;...&quot;).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Accessibility (IS 5568) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">נגישות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              פרטי רכז הנגישות והצהרת הנגישות של העסק (תקן ת"י 5568, WCAG 2.0 AA).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="accessibilityOfficerName">שם רכז הנגישות</Label>
                <Input id="accessibilityOfficerName" {...register('accessibilityOfficerName')} placeholder="שם מלא" />
              </div>
              <div>
                <Label htmlFor="accessibilityOfficerPhone">טלפון רכז הנגישות</Label>
                <Input id="accessibilityOfficerPhone" {...register('accessibilityOfficerPhone')} placeholder="050-000-0000" />
              </div>
              <div>
                <Label htmlFor="accessibilityOfficerEmail">דוא"ל רכז הנגישות</Label>
                <Input id="accessibilityOfficerEmail" type="email" {...register('accessibilityOfficerEmail')} placeholder="name@example.com" />
              </div>
            </div>
            <div>
              <Label htmlFor="accessibilityStatementText">טקסט הצהרת הנגישות</Label>
              <textarea
                id="accessibilityStatementText"
                rows={10}
                {...register('accessibilityStatementText')}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base resize-y"
                placeholder="הצהרת הנגישות המלאה — מה נעשה, מגבלות ידועות, נוהל פנייה..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                הטקסט יוצג בעמוד <code>/accessibility-statement</code>.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'שומר...' : 'שמירה'}
          </Button>
        </div>
      </form>
    </>
  );
}
