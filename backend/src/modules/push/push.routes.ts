import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { prisma } from '../../lib/prisma';
import { getVapidPublicKey } from '../../lib/push';

const router = Router();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

router.get('/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ key: getVapidPublicKey() });
});

router.post(
  '/subscribe',
  requireAuth,
  validate(subscribeSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const { endpoint, keys } = req.body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    });

    res.status(201).json({ ok: true, id: sub.id });
  },
);

router.delete(
  '/unsubscribe',
  requireAuth,
  validate(unsubscribeSchema),
  async (req: Request, res: Response) => {
    const { endpoint } = req.body as { endpoint: string };
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: req.user!.sub },
    });
    res.json({ ok: true });
  },
);

export default router;
