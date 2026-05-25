import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { lockSlot, releaseSlot } from './locking.service';

const router = Router();

const lockSchema = z.object({
  employeeId: z.string(),
  startAt: z.coerce.date(),
  guestId: z.string().optional(),
});

router.post('/lock', optionalAuth, validate(lockSchema), async (req, res) => {
  const { employeeId, startAt, guestId } = req.body as z.infer<typeof lockSchema>;
  // Use authenticated user id, or a stable guest id from the client, or generate one.
  const userId = req.user?.sub || guestId || `guest_${crypto.randomBytes(8).toString('hex')}`;
  const result = await lockSlot({ userId, employeeId, startAt });
  res.json({ ...result, ownerId: userId });
});

router.delete(
  '/lock',
  optionalAuth,
  validate(
    z.object({ employeeId: z.string(), startAt: z.coerce.date(), lockId: z.string(), ownerId: z.string().optional() }),
  ),
  async (req, res) => {
    const { employeeId, startAt, lockId, ownerId } = req.body as {
      employeeId: string; startAt: Date; lockId: string; ownerId?: string;
    };
    const userId = req.user?.sub || ownerId || '';
    await releaseSlot({ userId, employeeId, startAt, lockId });
    res.json({ ok: true });
  },
);

export default router;
