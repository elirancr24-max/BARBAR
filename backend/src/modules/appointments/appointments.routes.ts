import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment,
} from './appointments.service';
import { buildWhatsAppUrl, templates } from '../notifications/whatsapp';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { NotFound } from '../../lib/errors';

const router = Router();

const createSchema = z.object({
  employeeId: z.string(),
  serviceId: z.string(),
  startAt: z.coerce.date(),
  notes: z.string().optional(),
  customerUserId: z.string().optional(), // admin creating for someone
});

const updateSchema = z.object({
  startAt: z.coerce.date().optional(),
  employeeId: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().optional(),
});

router.get('/', requireAuth, async (req, res) => {
  const list = await listAppointments({
    user: req.user!,
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    employeeId: req.query.employeeId as string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: req.query.status as any,
  });
  res.json(list);
});

router.get('/:id', requireAuth, async (req, res) => {
  const a = await getAppointment(req.params.id, req.user!);
  res.json(a);
});

router.post('/', requireAuth, validate(createSchema), async (req, res) => {
  const dto = req.body as z.infer<typeof createSchema>;
  // ADMIN & BARBER can create for any customer (walk-in); CUSTOMER only for self
  const customerUserId =
    (req.user!.role === 'ADMIN' || req.user!.role === 'BARBER') && dto.customerUserId
      ? dto.customerUserId
      : req.user!.sub;

  const created = await createAppointment({
    customerUserId,
    employeeId: dto.employeeId,
    serviceId: dto.serviceId,
    startAt: dto.startAt,
    notes: dto.notes,
  });

  await auditFromReq(req, 'appointment.create', 'Appointment', created.id, null, created);
  res.status(201).json(created);
});

router.patch('/:id', requireAuth, validate(updateSchema), async (req, res) => {
  const { before, after } = await updateAppointment(req.params.id, req.user!, req.body);
  await auditFromReq(req, 'appointment.update', 'Appointment', after.id, before, after);
  res.json(after);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const cancelled = await deleteAppointment(req.params.id, req.user!);
  await auditFromReq(req, 'appointment.delete', 'Appointment', cancelled.id, null, cancelled);
  res.json(cancelled);
});

// Check-in: mark customer as arrived (toggle)
router.post('/:id/check-in', requireAuth, requireRole('ADMIN', 'BARBER'), async (req, res, next) => {
  const a = await prisma.appointment.findUnique({ where: { id: req.params.id } });
  if (!a) return next(NotFound());
  const checkingIn = !a.checkedInAt;
  const updated = await prisma.appointment.update({
    where: { id: req.params.id },
    data: {
      checkedInAt: checkingIn ? new Date() : null,
      status: checkingIn && a.status === 'PENDING' ? 'CONFIRMED' : a.status,
    },
    include: {
      service: true,
      employee: { include: { user: true } },
      customer: { select: { id: true, fullName: true, phone: true, email: true } },
    },
  });
  await auditFromReq(req, checkingIn ? 'appointment.checkin' : 'appointment.checkin.undo', 'Appointment', updated.id, a, updated);
  res.json(updated);
});

// Quick payment registration (manual — cash/card/bit)
router.post('/:id/pay', requireAuth, requireRole('ADMIN', 'BARBER'),
  validate(z.object({
    amountAgorot: z.number().int().min(0),
    tipAgorot: z.number().int().min(0).default(0),
    method: z.enum(['cash', 'card', 'bit', 'transfer', 'other']),
    markCompleted: z.boolean().optional().default(true),
  })),
  async (req, res, next) => {
    const a = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!a) return next(NotFound());
    const { amountAgorot, tipAgorot, method, markCompleted } = req.body as {
      amountAgorot: number; tipAgorot: number; method: string; markCompleted: boolean;
    };

    const payment = await prisma.payment.upsert({
      where: { appointmentId: a.id },
      create: {
        appointmentId: a.id,
        amountAgorot,
        tipAgorot,
        method,
        provider: 'manual',
        status: 'PAID',
        paidAt: new Date(),
      },
      update: { amountAgorot, tipAgorot, method, status: 'PAID', paidAt: new Date(), provider: 'manual' },
    });

    if (markCompleted && a.status !== 'COMPLETED') {
      await prisma.appointment.update({ where: { id: a.id }, data: { status: 'COMPLETED' } });
    }
    // Increment totalVisits on customer
    const customer = await prisma.customer.findUnique({ where: { userId: a.customerId } });
    if (customer) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { totalVisits: { increment: 1 } },
      });
    }

    await auditFromReq(req, 'payment.register', 'Payment', payment.id, null, payment);
    res.status(201).json(payment);
  });

// Clone (rebook) existing appointment to new time
router.post('/:id/clone', requireAuth, requireRole('ADMIN', 'BARBER'),
  validate(z.object({
    startAt: z.coerce.date(),
    employeeId: z.string().optional(),
    serviceId: z.string().optional(),
  })),
  async (req, res, next) => {
    const src = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!src) return next(NotFound('תור לא נמצא'));
    const { startAt, employeeId, serviceId } = req.body as { startAt: Date; employeeId?: string; serviceId?: string };
    const created = await createAppointment({
      customerUserId: src.customerId,
      employeeId: employeeId || src.employeeId,
      serviceId: serviceId || src.serviceId,
      startAt,
      notes: src.notes ?? undefined,
    });
    await auditFromReq(req, 'appointment.clone', 'Appointment', created.id, src, created);
    res.status(201).json(created);
  });

router.post('/:id/whatsapp', requireAuth, requireRole('ADMIN', 'BARBER'), async (req, res, next) => {
  const a = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { customer: true, service: true, employee: { include: { user: true } } },
  });
  if (!a) return next(NotFound());

  const kind = (req.query.kind as 'confirm' | 'reminder' | 'cancel' | 'change') || 'confirm';
  const message = templates[kind]({
    customerName: a.customer.fullName,
    serviceName: a.service.name,
    employeeName: a.employee.user.fullName,
    startAt: a.startAt,
    businessName: env.BUSINESS_NAME,
  });
  const url = buildWhatsAppUrl(a.customer.phone, message);

  await prisma.notificationLog.create({
    data: {
      appointmentId: a.id,
      channel: 'whatsapp',
      recipient: a.customer.phone,
      message,
      status: 'queued',
    },
  });

  res.json({ url, message });
});

export default router;
