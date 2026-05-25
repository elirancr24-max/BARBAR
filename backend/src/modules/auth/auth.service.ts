import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { BadRequest, Unauthorized } from '../../lib/errors';
import type { RegisterDto, LoginDto } from './auth.schemas';

const REFRESH_TTL_DAYS = 7;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function register(dto: RegisterDto, deviceInfo?: string) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
  });
  if (existing) throw BadRequest('משתמש עם אימייל או טלפון זה כבר קיים');

  const passwordHash = await bcrypt.hash(dto.password, 12);
  const user = await prisma.user.create({
    data: {
      email: dto.email,
      phone: dto.phone,
      fullName: dto.fullName,
      passwordHash,
      role: 'CUSTOMER',
      customer: { create: {} },
    },
  });

  return issueTokens(user.id, user.email, user.role, deviceInfo);
}

export async function login(dto: LoginDto, deviceInfo?: string) {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  if (!user || !user.active) throw Unauthorized('פרטי התחברות שגויים');

  const ok = await bcrypt.compare(dto.password, user.passwordHash);
  if (!ok) throw Unauthorized('פרטי התחברות שגויים');

  return issueTokens(user.id, user.email, user.role, deviceInfo);
}

export async function refresh(refreshToken: string, deviceInfo?: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw Unauthorized('Refresh token לא תקין');
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw Unauthorized('Refresh token פג תוקף');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.active) throw Unauthorized();

  // Rotate
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
  return issueTokens(user.id, user.email, user.role, deviceInfo);
}

export async function logout(refreshToken: string) {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
}

async function issueTokens(userId: string, email: string, role: string, deviceInfo?: string) {
  const accessToken = signAccessToken({ sub: userId, email, role: role as 'ADMIN' | 'BARBER' | 'CUSTOMER' });
  const refreshToken = signRefreshToken({ sub: userId });

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      deviceInfo,
    },
  });

  return { accessToken, refreshToken, user: { id: userId, email, role } };
}

export async function getMe(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      role: true,
      createdAt: true,
      employee: { select: { id: true, color: true } },
      customer: { select: { id: true, vip: true, totalVisits: true } },
    },
  });
}
