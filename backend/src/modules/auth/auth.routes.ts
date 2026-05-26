import { Router, type Request, type Response } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import { registerSchema, loginSchema } from './auth.schemas';
import * as authService from './auth.service';
import { writeAudit } from '../../middleware/audit';
import { isProd } from '../../config/env';

const router = Router();

const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: הרשמת לקוח חדש
 */
router.post('/register', authLimiter, validate(registerSchema), async (req: Request, res: Response) => {
  const deviceInfo = req.get('user-agent') || undefined;
  const result = await authService.register(req.body, deviceInfo);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  await writeAudit({
    actorId: result.user.id,
    actorRole: result.user.role,
    action: 'auth.register',
    entityType: 'User',
    entityId: result.user.id,
    ip: req.ip,
    userAgent: deviceInfo,
  });
  if (result.customerId) {
    await writeAudit({
      actorId: result.user.id,
      actorRole: result.user.role,
      action: 'privacy.consent.granted',
      entityType: 'Customer',
      entityId: result.customerId,
      after: { termsAccepted: true, privacyAccepted: true, marketingConsent: result.marketingConsent },
      ip: req.ip,
      userAgent: deviceInfo,
    });
  }
  res.status(201).json(result);
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: התחברות
 */
router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  const deviceInfo = req.get('user-agent') || undefined;
  const tokens = await authService.login(req.body, deviceInfo);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  await writeAudit({
    actorId: tokens.user.id,
    actorRole: tokens.user.role,
    action: 'auth.login',
    entityType: 'User',
    entityId: tokens.user.id,
    ip: req.ip,
    userAgent: deviceInfo,
  });
  res.json(tokens);
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  const deviceInfo = req.get('user-agent') || undefined;
  const tokens = await authService.refresh(refreshToken, deviceInfo);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json(tokens);
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 */
router.post('/logout', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  await authService.logout(refreshToken);
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.json({ ok: true });
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const me = await authService.getMe(req.user!.sub);
  res.json(me);
});

export default router;
