'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { api, setTokens } from '@/lib/api';
import { useAuth } from '@/store/auth';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      if (data.accessToken && data.refreshToken) setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      toast.success('נרשמת בהצלחה!');
      router.push('/my/appointments');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'שגיאה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/30 to-background">
      <Card className="w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-xl gold-gradient flex items-center justify-center">
            <Scissors className="w-7 h-7 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center mb-2">הרשמה</h1>
        <p className="text-center text-muted-foreground mb-8">צור חשבון חדש בדקה</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>שם מלא</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>אימייל</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>טלפון</Label>
            <Input type="tel" placeholder="050-0000000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>סיסמה (לפחות 8 תווים)</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          </div>
          <Button type="submit" variant="gold" className="w-full" size="lg" disabled={loading}>
            {loading ? 'מבצע רישום...' : 'הירשם'}
          </Button>
        </form>

        <div className="text-center mt-6 text-sm">
          <span className="text-muted-foreground">כבר רשום? </span>
          <Link href="/login" className="text-primary font-medium hover:underline">התחבר</Link>
        </div>
      </Card>
    </div>
  );
}
