import crypto from 'crypto';
import { prisma } from '../../lib/prisma';

function hashToken(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

function generatePlainToken(): string {
  // url-safe base64 of 32 random bytes
  return crypto
    .randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Creates a single-use cancel token for an appointment.
 * Stores only the SHA-256 hash; returns the plain token to caller exactly once.
 */
export async function createToken(appointmentId: string, expiresAt: Date): Promise<string> {
  const plain = generatePlainToken();
  const tokenHash = hashToken(plain);
  await prisma.appointmentCancelToken.create({
    data: {
      appointmentId,
      tokenHash,
      expiresAt,
    },
  });
  return plain;
}

/**
 * Consumes a token; returns the appointmentId if valid (and marks used),
 * or null if the token is unknown / used / expired.
 */
export async function consumeToken(plainToken: string): Promise<string | null> {
  if (!plainToken || typeof plainToken !== 'string') return null;
  const tokenHash = hashToken(plainToken);
  const now = new Date();
  const row = await prisma.appointmentCancelToken.findUnique({ where: { tokenHash } });
  if (!row) return null;
  if (row.usedAt) return null;
  if (row.expiresAt <= now) return null;
  // Atomic mark as used (guard against race)
  const updated = await prisma.appointmentCancelToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: now },
  });
  if (updated.count === 0) return null;
  return row.appointmentId;
}
