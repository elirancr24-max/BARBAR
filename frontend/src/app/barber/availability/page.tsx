'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

interface Hour { dayOfWeek: number; startTime: string; endTime: string; breakStart?: string|null; breakEnd?: string|null; }

export default function AvailabilityPage() {
  const user = useAuth((s) => s.user);
  const employeeId = user?.employee?.id;
  const [hours, setHours] = useState<Hour[]>([]);

  const { data } = useQuery({
    queryKey: ['working-hours', employeeId],
    enabled: !!employeeId,
    queryFn: async () => (await api.get<Hour[]>('/working-hours', { params: { employeeId } })).data,
  });

  useEffect(() => {
    if (data) setHours(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => (await api.put(`/working-hours/${employeeId}`, { hours: hours.filter(h => h.startTime && h.endTime) })).data,
    onSuccess: () => toast.success('נשמר'),
    onError: () => toast.error('שגיאה בשמירה'),
  });

  function setDay(dow: number, patch: Partial<Hour>) {
    const idx = hours.findIndex(h => h.dayOfWeek === dow);
    if (idx === -1) {
      setHours([...hours, { dayOfWeek: dow, startTime: '09:00', endTime: '18:00', ...patch }]);
    } else {
      const copy = [...hours];
      copy[idx] = { ...copy[idx], ...patch };
      setHours(copy);
    }
  }
  function removeDay(dow: number) {
    setHours(hours.filter(h => h.dayOfWeek !== dow));
  }

  return (
    <>
      <TopBar title="שעות זמינות" />
      <div className="p-6 space-y-4 max-w-3xl">
        {days.map((label, dow) => {
          const h = hours.find(x => x.dayOfWeek === dow);
          return (
            <Card key={dow}><CardContent className="p-4 flex items-center gap-3 flex-wrap">
              <div className="w-20 font-medium">{label}</div>
              {h ? (
                <>
                  <Input type="time" value={h.startTime} onChange={(e) => setDay(dow, { startTime: e.target.value })} className="w-32" />
                  <span>-</span>
                  <Input type="time" value={h.endTime} onChange={(e) => setDay(dow, { endTime: e.target.value })} className="w-32" />
                  <Button variant="ghost" size="sm" onClick={() => removeDay(dow)}>הסר</Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setDay(dow, {})}>הוסף יום</Button>
              )}
            </CardContent></Card>
          );
        })}
        <Button variant="gold" onClick={() => save.mutate()} disabled={save.isPending}>שמור שינויים</Button>
      </div>
    </>
  );
}
