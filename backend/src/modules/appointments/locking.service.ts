import crypto from 'crypto';
import { acquireLock, releaseLock, redis } from '../../lib/redis';
import { emitSlotEvent } from '../../lib/socket';
import { Conflict, Unauthorized } from '../../lib/errors';

const LOCK_TTL_SEC = 120;

function key(employeeId: string, startISO: string): string {
  return `lock:slot:${employeeId}:${startISO}`;
}

export async function lockSlot(params: {
  userId: string;
  employeeId: string;
  startAt: Date;
}): Promise<{ lockId: string; expiresAt: string }> {
  const startISO = params.startAt.toISOString();
  const lockId = crypto.randomBytes(16).toString('hex');
  const value = `${params.userId}:${lockId}`;
  const ok = await acquireLock(key(params.employeeId, startISO), LOCK_TTL_SEC, value);
  if (!ok) throw Conflict('הסלוט נתפס. אנא בחר זמן אחר.');

  emitSlotEvent('slot.locked', { employeeId: params.employeeId, startAt: startISO });

  return {
    lockId,
    expiresAt: new Date(Date.now() + LOCK_TTL_SEC * 1000).toISOString(),
  };
}

export async function verifyLock(params: {
  userId: string;
  employeeId: string;
  startAt: Date;
  lockId: string;
}): Promise<boolean> {
  const startISO = params.startAt.toISOString();
  const stored = await redis.get(key(params.employeeId, startISO));
  if (!stored) return false;
  const [uid, lid] = stored.split(':');
  return uid === params.userId && lid === params.lockId;
}

export async function releaseSlot(params: {
  userId: string;
  employeeId: string;
  startAt: Date;
  lockId: string;
}): Promise<void> {
  const startISO = params.startAt.toISOString();
  const value = `${params.userId}:${params.lockId}`;
  const released = await releaseLock(key(params.employeeId, startISO), value);
  if (!released) throw Unauthorized('Lock לא שלך או שפג תוקפו');
  emitSlotEvent('slot.unlocked', { employeeId: params.employeeId, startAt: startISO });
}

export async function forceReleaseAfterBooking(employeeId: string, startAt: Date): Promise<void> {
  const startISO = startAt.toISOString();
  await redis.del(key(employeeId, startISO));
  emitSlotEvent('slot.unlocked', { employeeId, startAt: startISO });
}
