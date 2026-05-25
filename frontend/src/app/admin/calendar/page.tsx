'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { AppointmentCalendar } from '@/components/calendar/CalendarShell';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface Employee { id: string; color: string; user: { fullName: string }; }

export default function AdminCalendarPage() {
  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined);
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await api.get<Employee[]>('/employees')).data,
  });

  return (
    <>
      <TopBar title="יומן תורים" />
      <div className="p-4 lg:p-6 space-y-4">
        {/* Employee filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">סינון:</span>
          <Button
            size="sm"
            variant={employeeId === undefined ? 'gold' : 'outline'}
            onClick={() => setEmployeeId(undefined)}
          >
            כל הספרים
          </Button>
          {employees.map((e) => (
            <Button
              key={e.id}
              size="sm"
              variant={employeeId === e.id ? 'gold' : 'outline'}
              onClick={() => setEmployeeId(e.id)}
            >
              <span className="w-2 h-2 rounded-full ms-1.5" style={{ background: e.color }} />
              {e.user.fullName}
            </Button>
          ))}
        </div>

        <AppointmentCalendar editable employeeIdFilter={employeeId} />
      </div>
    </>
  );
}
