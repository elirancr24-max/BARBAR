import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import { Forbidden, NotFound } from '../../lib/errors';
import { getPrimaryEmployeeId } from '../../lib/singleEmployee';
import { importIsraeliHolidays } from './holidays-import';

const router = Router();

router.post('/import-holidays', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = await importIsraeliHolidays();
    await auditFromReq(req, 'holidays.import', 'TimeOff', undefined, undefined, result);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

const timeOffSchema = z.object({
  employeeId: z.string().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
  isGlobal: z.boolean().optional(),
});

router.get('/', async (req, res) => {
  const { employeeId, from, to } = req.query as { employeeId?: string; from?: string; to?: string };
  const list = await prisma.timeOff.findMany({
    where: {
      ...(employeeId ? { OR: [{ employeeId }, { isGlobal: true }] } : {}),
      ...(from ? { endDate: { gte: new Date(from) } } : {}),
      ...(to ? { startDate: { lte: new Date(to) } } : {}),
    },
    orderBy: { startDate: 'asc' },
  });
  res.json(list);
});

router.post('/', requireAuth, validate(timeOffSchema), async (req, res, next) => {
  const dto = req.body as z.infer<typeof timeOffSchema>;
  // Fall back to primary employee when employeeId omitted (and not global)
  if (!dto.employeeId && !dto.isGlobal) {
    dto.employeeId = await getPrimaryEmployeeId();
  }
  // BARBER: only self, non-global
  if (req.user!.role === 'BARBER') {
    if (dto.isGlobal) return next(Forbidden('רק מנהל יכול לחסום ימים גלובלית'));
    const me = await prisma.employee.findUnique({ where: { userId: req.user!.sub } });
    if (!me || dto.employeeId !== me.id) return next(Forbidden());
  } else if (req.user!.role !== 'ADMIN') {
    return next(Forbidden());
  }

  const created = await prisma.timeOff.create({ data: dto });
  await auditFromReq(req, 'timeOff.create', 'TimeOff', created.id, null, created);
  res.status(201).json(created);
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  const to = await prisma.timeOff.findUnique({ where: { id: req.params.id } });
  if (!to) return next(NotFound());
  if (req.user!.role === 'BARBER') {
    const me = await prisma.employee.findUnique({ where: { userId: req.user!.sub } });
    if (!me || to.employeeId !== me.id) return next(Forbidden());
  } else if (req.user!.role !== 'ADMIN') {
    return next(Forbidden());
  }
  await prisma.timeOff.delete({ where: { id: req.params.id } });
  await auditFromReq(req, 'timeOff.delete', 'TimeOff', req.params.id, to, null);
  res.json({ ok: true });
});

export default router;
