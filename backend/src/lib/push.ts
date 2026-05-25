import webpush from 'web-push';
import { env } from '../config/env';
import { logger } from './logger';
import { prisma } from './prisma';

let pushEnabled = false;

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
  try {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    pushEnabled = true;
    logger.info('🔔 Web push enabled');
  } catch (err) {
    logger.warn({ err }, '⚠️  Failed to configure web-push VAPID details');
  }
} else {
  logger.warn('⚠️  VAPID keys missing — web push disabled');
}

export function isPushEnabled(): boolean {
  return pushEnabled;
}

export function getVapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY ?? null;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  if (!pushEnabled) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          data,
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription
            .delete({ where: { endpoint: sub.endpoint } })
            .catch(() => {
              /* ignore */
            });
          logger.info({ endpoint: sub.endpoint }, 'Removed dead push subscription');
        } else {
          logger.warn({ err, status, userId }, 'Push send failed');
        }
      }
    }),
  );
}

export async function sendPushToRole(
  role: 'ADMIN' | 'BARBER',
  payload: PushPayload,
): Promise<void> {
  if (!pushEnabled) return;
  const users = await prisma.user.findMany({ where: { role }, select: { id: true } });
  await Promise.all(users.map((u) => sendPush(u.id, payload)));
}
