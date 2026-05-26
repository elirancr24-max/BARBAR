'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatAgorot } from '@/lib/utils';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Service { id: string; name: string; description?: string|null; durationMin: number; priceAgorot: number; color: string; }

export default function ServicesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', durationMin: 30, priceAgorot: 8000, color: '#0ea5e9' });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await api.get<Service[]>('/services')).data,
  });

  const createMut = useMutation({
    mutationFn: async () => (await api.post('/services', form)).data,
    onSuccess: () => {
      toast.success('שירות נוסף');
      setShow(false);
      setForm({ name: '', description: '', durationMin: 30, priceAgorot: 8000, color: '#0ea5e9' });
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/services/${id}`)).data,
    onSuccess: () => { toast.success('הוסר'); qc.invalidateQueries({ queryKey: ['services'] }); },
  });

  return (
    <>
      <TopBar title="ניהול שירותים" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">{services.length} שירותים</h2>
          <Button variant="gold" onClick={() => setShow(!show)}><Plus className="w-4 h-4 ms-2" />הוסף שירות</Button>
        </div>

        {show && (
          <Card><CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>שם</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>תיאור</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>משך (דק')</Label><Input type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: +e.target.value })} /></div>
            <div><Label>מחיר (₪)</Label><Input type="number" value={form.priceAgorot / 100} onChange={(e) => setForm({ ...form, priceAgorot: +e.target.value * 100 })} /></div>
            <div><Label>צבע</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-11 w-24" /></div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShow(false)}>ביטול</Button>
              <Button variant="gold" onClick={() => createMut.mutate()}>שמור</Button>
            </div>
          </CardContent></Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <Card key={s.id}><CardContent className="p-5">
              <div className="flex justify-between items-start mb-2">
                <div className="font-semibold text-lg">{s.name}</div>
                <Button variant="ghost" size="icon" aria-label={`הסר שירות ${s.name}`} onClick={async () => {
                  const ok = await confirm({ title: 'להסיר שירות זה?', description: 'השירות יוסר מהמערכת.', confirmText: 'כן, הסר', variant: 'destructive' });
                  if (ok) deleteMut.mutate(s.id);
                }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              {s.description && <div className="text-sm text-muted-foreground mb-3">{s.description}</div>}
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm text-muted-foreground">{s.durationMin} דק'</span>
                <span className="font-bold text-primary">{formatAgorot(s.priceAgorot)}</span>
              </div>
            </CardContent></Card>
          ))}
        </div>
      </div>
    </>
  );
}
