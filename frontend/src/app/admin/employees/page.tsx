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
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Employee {
  id: string;
  color: string;
  bio?: string | null;
  commissionPct?: number | null;
  user: { id: string; fullName: string; email: string; phone: string };
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', bio: '', color: '#c9a961' });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-admin'],
    queryFn: async () => (await api.get<Employee[]>('/employees')).data,
  });

  const createMut = useMutation({
    mutationFn: async () => (await api.post('/employees', form)).data,
    onSuccess: () => {
      toast.success('ספר נוסף');
      setShowForm(false);
      setForm({ fullName: '', email: '', phone: '', password: '', bio: '', color: '#c9a961' });
      qc.invalidateQueries({ queryKey: ['employees-admin'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה');
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/employees/${id}`)).data,
    onSuccess: () => {
      toast.success('הוסר');
      qc.invalidateQueries({ queryKey: ['employees-admin'] });
    },
  });

  const commissionMut = useMutation({
    mutationFn: async ({ id, commissionPct }: { id: string; commissionPct: number | null }) =>
      (await api.put(`/employees/${id}`, { commissionPct })).data,
    onSuccess: () => {
      toast.success('אחוז עמלה עודכן');
      qc.invalidateQueries({ queryKey: ['employees-admin'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה');
    },
  });

  return (
    <>
      <TopBar title="ניהול ספרים" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">{employees.length} ספרים פעילים</h2>
          <Button variant="gold" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 ms-2" />
            הוסף ספר
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>שם מלא</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div><Label>אימייל</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>טלפון</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>סיסמה</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>תיאור</Label><Input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
              <div><Label>צבע ביומן</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-11 w-24" /></div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowForm(false)}>ביטול</Button>
                <Button variant="gold" onClick={() => createMut.mutate()} disabled={createMut.isPending}>שמור</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: e.color }}>
                    {e.user.fullName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{e.user.fullName}</div>
                    <div className="text-sm text-muted-foreground">{e.user.email}</div>
                    <div className="text-sm text-muted-foreground">{e.user.phone}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={async () => {
                    const ok = await confirm({ title: 'להסיר ספר זה?', description: 'הספר יוסר מהמערכת.', confirmText: 'כן, הסר', variant: 'destructive' });
                    if (ok) deleteMut.mutate(e.id);
                  }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 border-t pt-3">
                  <Label className="text-xs whitespace-nowrap">אחוז עמלה</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={e.commissionPct ?? ''}
                    placeholder="ברירת מחדל"
                    className="h-8 w-24 text-sm tabular-nums"
                    onBlur={(ev) => {
                      const raw = ev.target.value.trim();
                      const current = e.commissionPct ?? null;
                      const next = raw === '' ? null : Math.max(0, Math.min(100, Math.round(Number(raw))));
                      if (next === current) return;
                      commissionMut.mutate({ id: e.id, commissionPct: next });
                    }}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
