import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import { Forbidden, NotFound } from '../../lib/errors';

const router = Router();

const hourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakStart: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

const bulkSchema = z.object({ hours: z.array(hourSchema) });

router.get('/', async (req, res) => {
  const employeeId = req.query.employeeId as string | undefined;
  const hours = await prisma.workingHour.findMany({
    where: employeeId ? { employeeId } : undefined,
    orderBy: [{ employeeId: 'asc' }, { dayOfWeek: 'asc' }],
  });
  res.json(hours);
});

router.put('/:employeeId', requireAuth, validate(bulkSchema), async (req, res, next) => {
  const { employeeId } = req.params;
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) return next(NotFound('עובד לא נמצא'));

  // ADMIN can set anyone, BARBER only self
  if (req.user!.role === 'BARBER' && emp.userId !== req.user!.sub) return next(Forbidden());
  if (req.user!.role !== 'ADMIN' && req.user!.role !== 'BARBER') return next(Forbidden());

  const { hours } = req.body as z.infer<typeof bulkSchema>;
  await prisma.$transaction([
    prisma.workingHour.deleteMany({ where: { employeeId } }),
    prisma.workingHour.createMany({ data: hours.map((h) => ({ ...h, employeeId })) }),
  ]);
  await auditFromReq(req, 'workingHours.update', 'Employee', employeeId, null, hours);
  res.json({ ok: true });
});

export default router;
