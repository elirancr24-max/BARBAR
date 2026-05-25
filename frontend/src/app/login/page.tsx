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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.accessToken && data.refreshToken) setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      toast.success('ברוך הבא!');
      const role = data.user.role;
      router.push(role === 'ADMIN' ? '/admin/dashboard' : role === 'BARBER' ? '/barber/calendar' : '/my/appointments');
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
        <h1 className="text-3xl font-bold text-center mb-2">כניסת צוות</h1>
        <p className="text-center text-muted-foreground mb-8">למנהל / ספרים בלבד 🔒</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">אימייל</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">סיסמה</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" variant="gold" className="w-full" size="lg" disabled={loading}>
            {loading ? 'מתחבר...' : 'התחבר'}
          </Button>
        </form>

        <div className="text-center mt-6 text-sm">
          <Link href="/" className="text-muted-foreground hover:underline">חזרה לדף הבית</Link>
        </div>
      </Card>
    </div>
  );
}
