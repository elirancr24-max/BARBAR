'use client';

import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Flag, ScrollText, UserCog } from 'lucide-react';

export default function AdminSettings() {
  const items = [
    { href: '/admin/settings/flags', icon: Flag, label: 'Feature Flags', desc: 'הפעלה/כיבוי פיצ\'רים' },
    { href: '/admin/audit-logs', icon: ScrollText, label: 'לוגי פעילות', desc: 'היסטוריית פעולות במערכת' },
    { href: '/admin/employees', icon: UserCog, label: 'עובדים', desc: 'ניהול ספרים' },
  ];

  return (
    <>
      <TopBar title="הגדרות" />
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((i) => (
          <Link key={i.href} href={i.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <i.icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold mb-1">{i.label}</div>
                  <div className="text-sm text-muted-foreground">{i.desc}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
