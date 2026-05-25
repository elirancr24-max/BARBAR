import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import { NotFound } from '../../lib/errors';

const router = Router();

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMin: z.number().int().min(5).max(480),
  priceAgorot: z.number().int().min(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  active: z.boolean().optional(),
});

router.get('/', async (_req, res) => {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: { employees: { select: { employeeId: true } } },
  });
  res.json(services);
});

router.get('/:id', async (req, res, next) => {
  const svc = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!svc) return next(NotFound('שירות לא נמצא'));
  res.json(svc);
});

router.post('/', requireAuth, requireRole('ADMIN'), validate(serviceSchema), async (req, res) => {
  const created = await prisma.service.create({ data: req.body });
  await auditFromReq(req, 'service.create', 'Service', created.id, null, created);
  res.status(201).json(created);
});

router.patch('/:id', requireAuth, requireRole('ADMIN'), validate(serviceSchema.partial()), async (req, res, next) => {
  const before = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!before) return next(NotFound('שירות לא נמצא'));
  const updated = await prisma.service.update({ where: { id: req.params.id }, data: req.body });
  await auditFromReq(req, 'service.update', 'Service', updated.id, before, updated);
  res.json(updated);
});

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  const before = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!before) return next(NotFound('שירות לא נמצא'));
  // soft delete
  const updated = await prisma.service.update({ where: { id: req.params.id }, data: { active: false } });
  await auditFromReq(req, 'service.delete', 'Service', updated.id, before, updated);
  res.json({ ok: true });
});

// Service ↔ Employee linkage
router.put('/:id/employees', requireAuth, requireRole('ADMIN'),
  validate(z.object({ employeeIds: z.array(z.string()) })),
  async (req, res) => {
    const { employeeIds } = req.body as { employeeIds: string[] };
    await prisma.servicesOnEmployees.deleteMany({ where: { serviceId: req.params.id } });
    await prisma.servicesOnEmployees.createMany({
      data: employeeIds.map((eid) => ({ serviceId: req.params.id, employeeId: eid })),
      skipDuplicates: true,
    });
    res.json({ ok: true });
  });

export default router;
