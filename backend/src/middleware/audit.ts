import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

function safeStringify(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  try {
    return JSON.stringify(v);
  } catch {
    return undefined;
  }
}

export async function writeAudit(input: {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        before: safeStringify(input.before),
        after: safeStringify(input.after),
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Audit log write failed');
  }
}

export function auditFromReq(
  req: Request,
  action: string,
  entityType: string,
  entityId?: string,
  before?: unknown,
  after?: unknown,
): Promise<void> {
  return writeAudit({
    actorId: req.user?.sub,
    actorRole: req.user?.role,
    action,
    entityType,
    entityId,
    before,
    after,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
}

export function auditAction(action: string, entityType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        void auditFromReq(req, action, entityType, req.params.id);
      }
    });
    next();
  };
}
