import { Scissors, LayoutDashboard, Calendar, Users, BarChart3, Settings, CalendarX, UserCircle2, Megaphone } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'דשבורד', icon: LayoutDashboard },
  { href: '/admin/calendar', label: 'יומן', icon: Calendar },
  { href: '/admin/services', label: 'שירותים', icon: Scissors },
  { href: '/admin/customers', label: 'לקוחות', icon: Users },
  { href: '/admin/time-off', label: 'חופשות', icon: CalendarX },
  { href: '/admin/reports', label: 'דוחות', icon: BarChart3 },
  { href: '/admin/marketing', label: 'שיווק', icon: Megaphone },
  { href: '/admin/profile', label: 'הפרופיל שלי', icon: UserCircle2 },
  { href: '/admin/settings', label: 'הגדרות', icon: Settings },
];

export const customerNav: NavItem[] = [
  { href: '/my/appointments', label: 'התורים שלי', icon: Calendar },
  { href: '/book', label: 'קביעת תור', icon: Scissors },
];
