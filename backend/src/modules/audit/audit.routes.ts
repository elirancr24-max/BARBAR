import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', async (req, res) => {
  const { actorId, action, entityType, from, to } = req.query as Record<string, string | undefined>;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Number(req.query.limit) || 50);

  const where = {
    ...(actorId && { actorId }),
    ...(action && { action: { contains: action } }),
    ...(entityType && { entityType }),
    ...(from || to ? { createdAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { actor: { select: { fullName: true, email: true } } },
    }),
  ]);

  res.json({ data: items, meta: { total, page, pages: Math.ceil(total / limit) } });
});

router.get('/:entityType/:entityId', async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { entityType: req.params.entityType, entityId: req.params.entityId },
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { fullName: true, email: true } } },
  });
  res.json(logs);
});

export default router;
