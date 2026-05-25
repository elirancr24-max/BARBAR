import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type JwtPayload } from '../lib/jwt';
import { Unauthorized, Forbidden } from '../lib/errors';
import type { Role } from '../types/db';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Dual-mode auth: Bearer header (Mobile) OR access_token cookie (Web).
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    const cookieToken = req.cookies?.access_token as string | undefined;
    const token = bearer || cookieToken;

    if (!token) throw Unauthorized();
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(Unauthorized());
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    const cookieToken = req.cookies?.access_token as string | undefined;
    const token = bearer || cookieToken;
    if (token) req.user = verifyAccessToken(token);
  } catch {
    // ignore
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Unauthorized());
    if (!roles.includes(req.user.role)) return next(Forbidden());
    next();
  };
}
