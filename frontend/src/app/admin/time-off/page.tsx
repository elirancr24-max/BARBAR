'use client';

import { TopBar } from '@/components/layout/TopBar';
import { TimeOffManager } from '@/components/time-off/TimeOffManager';

export default function AdminTimeOffPage() {
  return (
    <>
      <TopBar title="חופשות וחסימות" subtitle="ניהול ימי סגירה של המספרה והספרים" />
      <div className="p-4 lg:p-6 page-enter max-w-3xl">
        <TimeOffManager scope="admin" />
      </div>
    </>
  );
}
