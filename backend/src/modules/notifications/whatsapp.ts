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

interface TmplCtx {
  customerName: string;
  serviceName: string;
  employeeName: string;
  startAt: Date;
  businessName: string;
}

export const templates = {
  confirm: (c: TmplCtx) =>
    `שלום ${c.customerName} 👋\nהתור שלך ב-${c.businessName} אושר!\n\n💈 שירות: ${c.serviceName}\n👤 ספר: ${c.employeeName}\n📅 ${formatDateHebrew(c.startAt)}\n\nנשמח לראותך!`,
  reminder: (c: TmplCtx) =>
    `היי ${c.customerName} ⏰\nתזכורת — יש לך תור מחר ב-${c.businessName}.\n\n💈 ${c.serviceName} עם ${c.employeeName}\n📅 ${formatDateHebrew(c.startAt)}\n\nנתראה!`,
  cancel: (c: TmplCtx) =>
    `שלום ${c.customerName},\nהתור שלך ב-${c.businessName} ל-${formatDateHebrew(c.startAt)} בוטל.\nלשאלות ניתן להשיב להודעה זו.`,
  change: (c: TmplCtx) =>
    `שלום ${c.customerName},\nהתור שלך עודכן ל-${formatDateHebrew(c.startAt)} עם ${c.employeeName}.\nנתראה ב-${c.businessName}!`,
};
