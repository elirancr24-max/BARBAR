import crypto from 'crypto';
import { env } from '../config/env';

const SECRET = env.JWT_ACCESS_SECRET; // reuse for HMAC

export function makeUnsubscribeToken(customerId: string): string {
  const payload = `${customerId}.${Date.now()}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyUnsubscribeToken(token: string): { customerId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const [customerId, ts, sig] = decoded.split('.');
    if (!customerId || !ts || !sig) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(`${customerId}.${ts}`).digest('base64url');
    if (sig !== expected) return null;
    // No expiration — unsubscribe links should always work
    return { customerId };
  } catch {
    return null;
  }
}
