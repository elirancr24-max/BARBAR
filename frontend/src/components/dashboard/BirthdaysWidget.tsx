'use client';

import { useQuery } from '@tanstack/react-query';
import { Cake, MessageCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';

interface Birthday {
  id: string;
  fullName: string;
  phone: string;
  daysUntil: number;
  next: string;
}

const greeting = (name: string) =>
  encodeURIComponent(`היי ${name}! 🎂✨\nכל הצוות של בר אברג׳יל מאחל לך יום הולדת שמח!\nבא לחגוג עם תספורת חגיגית? 💈`);

export function BirthdaysWidget() {
  const { data = [] } = useQuery({
    queryKey: ['birthdays'],
    queryFn: async () => (await api.get<Birthday[]>('/reports/birthdays')).data,
    staleTime: 5 * 60_000,
  });

  if (data.length === 0) return null;

  const thisWeek = data.filter((b) => b.daysUntil <= 7);
  if (thisWeek.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cake className="w-5 h-5 text-pink-500" />
          ימי הולדת השבוע
          <span className="text-xs font-normal bg-pink-500/15 text-pink-600 px-2 py-0.5 rounded-full">
            {thisWeek.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {thisWeek.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-lg">
                🎂
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{b.fullName}</div>
                <div className="text-xs text-muted-foreground">
                  {b.daysUntil === 0 ? '🎉 היום!' : b.daysUntil === 1 ? 'מחר' : `בעוד ${b.daysUntil} ימים`}
                </div>
              </div>
              <a
                href={`https://wa.me/${b.phone.replace(/\D/g, '')}?text=${greeting(b.fullName)}`}
                target="_blank"
                rel="noopener"
                className="text-xs text-emerald-600 hover:bg-emerald-500/15 rounded-md px-2 py-1 flex items-center gap-1 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                שלח ברכה
              </a>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
