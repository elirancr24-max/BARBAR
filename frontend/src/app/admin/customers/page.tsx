'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Star, Users, Phone, Mail, ChevronLeft } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api';

interface Customer {
  id: string;
  vip: boolean;
  totalVisits: number;
  notes?: string|null;
  user: { id: string; fullName: string; email: string; phone: string; createdAt: string };
}

export default function CustomersPage() {
  const pathname = usePathname();
  const basePath = pathname.startsWith('/barber') ? '/barber/customers' : '/admin/customers';
  const [q, setQ] = useState('');
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', q],
    queryFn: async () => (await api.get<Customer[]>('/customers', { params: q ? { q } : {} })).data,
  });

  return (
    <>
      <TopBar title="לקוחות" />
      <div className="p-4 lg:p-6 space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חפש לפי שם / אימייל / טלפון" className="pe-10" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ListSkeleton count={6} />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState icon={Users} title={q ? 'לא נמצאו תוצאות' : 'אין לקוחות עדיין'} description={q ? 'נסה חיפוש אחר' : 'לקוחות יתווספו אוטומטית בקביעת תור'} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((c) => (
              <Link key={c.id} href={`${basePath}/${c.id}`} prefetch>
                <Card className="hover:shadow-lg hover:border-primary/40 transition-all group cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {c.user.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold flex items-center gap-1 truncate">
                          {c.user.fullName} {c.vip && <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{c.totalVisits} ביקורים</div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />{c.user.phone}
                      </span>
                      <span className="flex items-center gap-2 text-muted-foreground truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{c.user.email}</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
