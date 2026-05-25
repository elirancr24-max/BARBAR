'use client';

import { TopBar } from '@/components/layout/TopBar';
import { AppointmentCalendar } from '@/components/calendar/CalendarShell';
import { NextAppointment } from '@/components/dashboard/NextAppointment';
import { EnablePushButton } from '@/components/pwa/EnablePushButton';

export default function BarberCalendarPage() {
  return (
    <>
      <TopBar title="היומן שלי" subtitle="ניהול תורים ולקוחות" />
      <div className="p-4 lg:p-6 space-y-6 page-enter">
        <div className="flex justify-end">
          <EnablePushButton />
        </div>
        <NextAppointment />
        <AppointmentCalendar editable />
      </div>
    </>
  );
}
