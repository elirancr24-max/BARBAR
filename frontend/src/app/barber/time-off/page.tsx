'use client';

import { TopBar } from '@/components/layout/TopBar';
import { TimeOffManager } from '@/components/time-off/TimeOffManager';

export default function BarberTimeOffPage() {
  return (
    <>
      <TopBar title="חופשות וחסימות" subtitle="ניהול הימים בהם אינך זמין" />
      <div className="p-4 lg:p-6 page-enter max-w-3xl">
        <TimeOffManager scope="self" />
      </div>
    </>
  );
}
