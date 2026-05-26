import { prisma } from '../../lib/prisma';

function normalizePhone(phone: string): string {
  let p = phone.replace(/[^\d]/g, '');
  if (p.startsWith('0')) p = '972' + p.slice(1);
  return p;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

function formatDateHebrew(date: Date): string {
  const dt = new Date(date);
  return dt.toLocaleString('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
  });
}

export type TemplateKey =
  | 'confirm'
  | 'reminder'
  | 'cancel'
  | 'change'
  | 'newBookingToBarber'
  | 'reviewRequest'
  | 'slotAvailable';

export interface TmplCtx {
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  employeeName: string;
  startAt: Date;
  businessName: string;
  notes?: string | null;
  reviewLink?: string;
  bookingLink?: string;
  cancelLink?: string;
}

export const TEMPLATE_LABELS: Record<TemplateKey, { label: string; description: string; toCustomer: boolean }> = {
  confirm: {
    label: 'אישור תור',
    description: 'נשלח ללקוח כשהתור מאושר',
    toCustomer: true,
  },
  reminder: {
    label: 'תזכורת',
    description: 'נשלח ללקוח 24 שעות לפני התור',
    toCustomer: true,
  },
  cancel: {
    label: 'ביטול תור',
    description: 'נשלח ללקוח כשהתור מבוטל',
    toCustomer: true,
  },
  change: {
    label: 'שינוי תור',
    description: 'נשלח ללקוח כשהתור מועבר לזמן אחר',
    toCustomer: true,
  },
  newBookingToBarber: {
    label: 'הודעה לספר על תור חדש',
    description: 'נשלח אליך (הספר) כשלקוח קובע תור חדש',
    toCustomer: false,
  },
  reviewRequest: {
    label: 'בקשת ביקורת',
    description: 'נשלח ללקוח אחרי שהתור הושלם — בקשת דירוג',
    toCustomer: true,
  },
  slotAvailable: {
    label: 'תור פנוי לרשימת המתנה',
    description: 'נשלח ללקוח שברשימת המתנה כשמתפנה תור',
    toCustomer: true,
  },
};

// Built-in defaults — used when employee hasn't customized
export const defaultTemplates: Record<TemplateKey, string> = {
  confirm:
    'שלום {customerName} 👋\nהתור שלך ב-{businessName} אושר!\n\n💈 שירות: {serviceName}\n👤 ספר: {employeeName}\n📅 {dateTime}\n\nנשמח לראותך!',
  reminder:
    'היי {customerName} ⏰\nתזכורת — יש לך תור מחר ב-{businessName}.\n\n💈 {serviceName} עם {employeeName}\n📅 {dateTime}\n\nלביטול: {cancelLink}\n\nנתראה!',
  cancel:
    'שלום {customerName},\nהתור שלך ב-{businessName} ל-{dateTime} בוטל.\n\nאם תרצה לקבוע מחדש — נשמח לסייע 💈\nתודה על ההבנה.',
  change:
    'שלום {customerName} 👋\nהתור שלך עודכן לזמן חדש:\n\n📅 {dateTime}\n👤 ספר: {employeeName}\n💈 שירות: {serviceName}\n\nנתראה ב-{businessName}!',
  newBookingToBarber:
    '💈 תור חדש נקבע!\n\n👤 לקוח: {customerName}\n📞 טלפון: {customerPhone}\n💼 שירות: {serviceName}\n📅 {dateTime}\n\n— {businessName}',
  reviewRequest:
    'שלום {customerName} 🙏\nתודה שבחרת ב-{businessName}!\nנשמח אם תוכל לדרג את החוויה שלך עם {employeeName} (לוקח 10 שניות):\n\n{reviewLink}\n\nכל דירוג עוזר לנו להשתפר ❤️',
  slotAvailable:
    'שלום {customerName} 🎉\nהתפנה תור ב-{businessName}!\n\n📅 {dateTime}\n💈 {serviceName} עם {employeeName}\n\nלהזמנה מהירה: {bookingLink}\nרוצה? השב להודעה זו ונסגור עכשיו.',
};

function applyVars(template: string, ctx: TmplCtx): string {
  const dateTime = formatDateHebrew(ctx.startAt);
  return template
    .replace(/\{customerName\}/g, ctx.customerName)
    .replace(/\{customerPhone\}/g, ctx.customerPhone || '')
    .replace(/\{serviceName\}/g, ctx.serviceName)
    .replace(/\{employeeName\}/g, ctx.employeeName)
    .replace(/\{businessName\}/g, ctx.businessName)
    .replace(/\{dateTime\}/g, dateTime)
    .replace(/\{notes\}/g, ctx.notes || '')
    .replace(/\{reviewLink\}/g, ctx.reviewLink || '')
    .replace(/\{bookingLink\}/g, ctx.bookingLink || '')
    .replace(/\{cancelLink\}/g, ctx.cancelLink || '');
}

interface EmployeeTemplateConfig {
  enabled: boolean;
  template: string;
}

export type EmployeeTemplates = Partial<Record<TemplateKey, EmployeeTemplateConfig>>;

/**
 * Returns the rendered message and whether it's enabled for the given employee + kind.
 * Falls back to defaults if employee hasn't customized.
 */
export async function renderTemplate(
  employeeId: string,
  kind: TemplateKey,
  ctx: TmplCtx,
): Promise<{ enabled: boolean; message: string }> {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { messageTemplates: true },
  });
  const stored = (emp?.messageTemplates as EmployeeTemplates | null) ?? {};
  const cfg = stored[kind];
  const enabled = cfg?.enabled !== false; // default = enabled
  const template = cfg?.template?.trim() || defaultTemplates[kind];
  return { enabled, message: applyVars(template, ctx) };
}

/** Legacy export — old code calls templates.confirm({...}) etc. */
export const templates: Record<TemplateKey, (ctx: TmplCtx) => string> = {
  confirm: (c) => applyVars(defaultTemplates.confirm, c),
  reminder: (c) => applyVars(defaultTemplates.reminder, c),
  cancel: (c) => applyVars(defaultTemplates.cancel, c),
  change: (c) => applyVars(defaultTemplates.change, c),
  newBookingToBarber: (c) => applyVars(defaultTemplates.newBookingToBarber, c),
  reviewRequest: (c) => applyVars(defaultTemplates.reviewRequest, c),
  slotAvailable: (c) => applyVars(defaultTemplates.slotAvailable, c),
};
