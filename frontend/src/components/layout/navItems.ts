import { Scissors, LayoutDashboard, Calendar, Users, UserCog, BarChart3, Flag, ScrollText, Settings, Clock, CalendarX } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'דשבורד', icon: LayoutDashboard },
  { href: '/admin/calendar', label: 'יומן', icon: Calendar },
  { href: '/admin/employees', label: 'ספרים', icon: UserCog },
  { href: '/admin/services', label: 'שירותים', icon: Scissors },
  { href: '/admin/customers', label: 'לקוחות', icon: Users },
  { href: '/admin/time-off', label: 'חופשות', icon: CalendarX },
  { href: '/admin/reports', label: 'דוחות', icon: BarChart3 },
  { href: '/admin/audit-logs', label: 'לוגים', icon: ScrollText },
  { href: '/admin/settings/flags', label: 'Feature Flags', icon: Flag },
  { href: '/admin/settings', label: 'הגדרות', icon: Settings },
];

export const barberNav: NavItem[] = [
  { href: '/barber/calendar', label: 'היומן שלי', icon: Calendar },
  { href: '/barber/availability', label: 'שעות זמינות', icon: Clock },
  { href: '/barber/time-off', label: 'חופשות', icon: CalendarX },
  { href: '/barber/customers', label: 'לקוחות', icon: Users },
];

export const customerNav: NavItem[] = [
  { href: '/my/appointments', label: 'התורים שלי', icon: Calendar },
  { href: '/book', label: 'קביעת תור', icon: Scissors },
];
