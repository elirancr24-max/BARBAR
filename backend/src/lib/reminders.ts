import { prisma } from './prisma';
import { logger } from './logger';
import { sendPushToRole } from './push';
import { env } from '../config/env';
import { buildWhatsAppUrl, templates } from '../modules/notifications/whatsapp';

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const INITIAL_DELAY_MS = 5_000;

async function runReminderTick(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  try {
    const due = await prisma.appointment.findMany({
      where: {
        startAt: { gte: windowStart, lte: windowEnd },
        status: { in: ['PENDING', 'CONFIRMED'] },
        reminderSentAt: null,
      },
      include: {
        service: true,
        employee: { include: { user: true } },
        customer: { select: { id: true, fullName: true, phone: true } },
      },
    });

    if (due.length === 0) return;
    logger.info({ count: due.length }, '⏰ Reminder tick: appointments due');

    for (const appt of due) {
      const customerName = appt.customer?.fullName ?? 'לקוח';
      const employeeName = appt.employee.user.fullName;
      const phone = appt.customer?.phone ?? '';

      const message = templates.reminder({
        customerName,
        serviceName: appt.service.name,
        employeeName,
        startAt: appt.startAt,
        businessName: env.BUSINESS_NAME,
      });

      const waUrl = phone ? buildWhatsAppUrl(phone, message) : undefined;

      const timeStr = appt.startAt.toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: env.BUSINESS_TIMEZONE,
      });

      const payload = {
        title: '⏰ תזכורת — תור מחר',
        body: `${customerName} · ${appt.service.name} · ${timeStr}`,
        url: waUrl ?? '/admin/calendar',
        tag: `reminder-${appt.id}`,
      };

      try {
        await sendPushToRole('BARBER', payload);
        await sendPushToRole('ADMIN', payload);
      } catch (err) {
        logger.warn({ err, apptId: appt.id }, 'Reminder push failed');
      }

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });

      await prisma.notificationLog.create({
        data: {
          appointmentId: appt.id,
          channel: 'reminder',
          recipient: phone || customerName,
          message,
          status: 'queued',
          meta: waUrl ? JSON.stringify({ waUrl }) : null,
        },
      });
    }
  } catch (err) {
    logger.error({ err }, 'Reminder tick failed');
  }
}

export function startReminderJob(): void {
  logger.info('⏰ Reminder job scheduled (every 30 minutes)');
  setTimeout(() => {
    void runReminderTick();
    setInterval(() => {
      void runReminderTick();
    }, INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}
