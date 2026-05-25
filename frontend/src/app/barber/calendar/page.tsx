'use client';

import { TopBar } from '@/components/layout/TopBar';
import { AppointmentCalendar } from '@/components/calendar/CalendarShell';
import { NextAppointment } from '@/components/dashboard/NextAppointment';

export default function BarberCalendarPage() {
  return (
    <>
      <TopBar title="היומן שלי" subtitle="ניהול תורים ולקוחות" />
      <div className="p-4 lg:p-6 space-y-6 page-enter">
        <NextAppointment />
        <AppointmentCalendar editable />
      </div>
    </>
  );
}
