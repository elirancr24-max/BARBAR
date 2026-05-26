import { prisma } from './prisma';
import { logger } from './logger';
import { env } from '../config/env';
import { writeAudit } from '../middleware/audit';
import { renderTemplate, buildWhatsAppUrl, normalizePhone } from '../modules/notifications/whatsapp';
import { getPrimaryEmployeeId } from './singleEmployee';
import { makeUnsubscribeToken } from './marketingUnsubscribe';
import { sendPushToRole } from './push';

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const INITIAL_DELAY_MS = 60_000;

async function runBirthdayTick(): Promise<void> {
  const now = new Date();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);

  try {
    const users = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        active: true,
        birthday: { not: null },
        // Spam law (Amendment 40): only send to customers who have consented to marketing
        customer: { blocked: false, marketingConsent: true },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        birthday: true,
        customer: { select: { id: true, blocked: true } },
      },
    });

    const todayCelebrants = users.filter((u) => {
      const b = u.birthday;
      if (!b) return false;
      return b.getMonth() === todayMonth && b.getDate() === todayDay;
    });

    if (todayCelebrants.length === 0) return;

    logger.info({ count: todayCelebrants.length }, '🎂 Birthday tick: customers celebrating today');

    let employeeId: string;
    try {
      employeeId = await getPrimaryEmployeeId();
    } catch (err) {
      logger.warn({ err }, 'Birthday cron: no primary employee — skipping');
      return;
    }

    let queued = 0;
    for (const u of todayCelebrants) {
      try {
        if (!u.customer) continue;
        const phone = u.phone ? normalizePhone(u.phone) : null;
        if (!phone) continue;

        // dedupe: any birthdayGreeting log to this recipient in last 24h?
        const since = new Date(now.getTime() - INTERVAL_MS);
        const existing = await prisma.notificationLog.findFirst({
          where: {
            recipient: phone,
            createdAt: { gte: since },
            meta: { contains: 'birthdayGreeting' },
          },
          select: { id: true },
        });
        if (existing) continue;

        const publicBase = env.PUBLIC_URL.replace(/\/$/, '');
        const unsubscribeLink = `${publicBase}/unsubscribe?t=${makeUnsubscribeToken(u.customer.id)}`;
        const { enabled, message } = await renderTemplate(employeeId, 'birthdayGreeting', {
          customerName: u.fullName,
          serviceName: '',
          employeeName: '',
          startAt: now,
          businessName: env.BUSINESS_NAME,
          unsubscribeLink,
        });
        if (!enabled) continue;

        const url = buildWhatsAppUrl(phone, message);
        if (!url) continue;

        await prisma.notificationLog.create({
          data: {
            channel: 'whatsapp',
            recipient: phone,
            message,
            status: 'queued',
            meta: JSON.stringify({ kind: 'birthdayGreeting', url, customerId: u.customer.id }),
          },
        });

        await writeAudit({
          actorId: null,
          actorRole: 'SYSTEM',
          action: 'campaign.birthday.queued',
          entityType: 'Customer',
          entityId: u.customer.id,
          after: { phone },
        });

        queued++;
      } catch (err) {
        logger.warn({ err, userId: u.id }, 'Birthday queue failed for customer');
      }
    }

    if (queued > 0) {
      try {
        await sendPushToRole('ADMIN', {
          title: '🎂 יום הולדת היום',
          body: `${queued} לקוחות חוגגים — שלח להם איחול`,
          url: '/admin/marketing',
        });
      } catch (err) {
        logger.warn({ err }, 'Birthday push notification failed');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Birthday tick failed');
  }
}

export function startBirthdayCron(): void {
  logger.info('🎂 Birthday cron scheduled (every 24 hours)');
  setTimeout(() => {
    void runBirthdayTick();
    setInterval(() => {
      void runBirthdayTick();
    }, INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}
