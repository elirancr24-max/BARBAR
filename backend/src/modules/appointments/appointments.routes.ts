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
import { buildWhatsAppUrl, renderTemplate, type TemplateKey } from '../notifications/whatsapp';
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

  // For customers booking themselves — suggest barberWhatsapp; for staff walk-ins — skip
  let barberWhatsapp: { url: string; message: string } | null = null;
  if (req.user!.role === 'CUSTOMER') {
    try {
      const { enabled, message } = await renderTemplate(created.employeeId, 'newBookingToBarber', {
        customerName: created.customer.fullName,
        customerPhone: created.customer.phone,
        serviceName: created.service.name,
        employeeName: created.employee.user.fullName,
        startAt: created.startAt,
        businessName: env.BUSINESS_NAME,
        notes: created.notes,
      });
      if (enabled && created.employee.user.phone) {
        barberWhatsapp = {
          url: buildWhatsAppUrl(created.employee.user.phone, message),
          message,
        };
      }
    } catch { /* non-fatal */ }
  }

  res.status(201).json({ ...created, barberWhatsapp });
});

router.patch('/:id', requireAuth, validate(updateSchema), async (req, res) => {
  const { before, after } = await updateAppointment(req.params.id, req.user!, req.body);
  await auditFromReq(req, 'appointment.update', 'Appointment', after.id, before, after);

  // Decide which template to suggest based on patch
  let suggestedKind: TemplateKey | null = null;
  if (req.body.status === 'CANCELLED') suggestedKind = 'cancel';
  else if (req.body.startAt || req.body.employeeId) suggestedKind = 'change';
  else if (req.body.status === 'CONFIRMED' && before.status !== 'CONFIRMED') suggestedKind = 'confirm';
  else if (req.body.status === 'COMPLETED' && before.status !== 'COMPLETED') suggestedKind = 'reviewRequest';

  let whatsapp: { url: string; message: string; kind: TemplateKey } | null = null;
  if (suggestedKind && (req.user!.role === 'ADMIN' || req.user!.role === 'BARBER')) {
    const reviewLink = `${env.PUBLIC_URL || 'https://barbar2026.vercel.app'}/reviews?code=${after.confirmationCode}`;
    const { enabled, message } = await renderTemplate(after.employeeId, suggestedKind, {
      customerName: after.customer.fullName,
      customerPhone: after.customer.phone,
      serviceName: after.service.name,
      employeeName: after.employee.user.fullName,
      startAt: after.startAt,
      businessName: env.BUSINESS_NAME,
      notes: after.notes,
      reviewLink,
    });
    if (enabled) {
      whatsapp = {
        url: buildWhatsAppUrl(after.customer.phone, message),
        message,
        kind: suggestedKind,
      };
    }
  }

  res.json({ ...after, whatsapp });
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  const beforeAppt = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: {
      service: true,
      employee: { include: { user: true } },
      customer: { select: { id: true, fullName: true, phone: true } },
    },
  });
  if (!beforeAppt) return next(NotFound());

  const cancelled = await deleteAppointment(req.params.id, req.user!);
  await auditFromReq(req, 'appointment.delete', 'Appointment', cancelled.id, null, cancelled);

  let whatsapp: { url: string; message: string; kind: TemplateKey } | null = null;
  if (req.user!.role === 'ADMIN' || req.user!.role === 'BARBER') {
    const { enabled, message } = await renderTemplate(beforeAppt.employeeId, 'cancel', {
      customerName: beforeAppt.customer.fullName,
      customerPhone: beforeAppt.customer.phone,
      serviceName: beforeAppt.service.name,
      employeeName: beforeAppt.employee.user.fullName,
      startAt: beforeAppt.startAt,
      businessName: env.BUSINESS_NAME,
      notes: beforeAppt.notes,
    });
    if (enabled) {
      whatsapp = {
        url: buildWhatsAppUrl(beforeAppt.customer.phone, message),
        message,
        kind: 'cancel',
      };
    }
  }

  // Find matching waitlist entries — alert them about the now-open slot
  type WaitlistMatch = { id: string; customerName: string; customerPhone: string; whatsappUrl: string; message: string };
  const waitlistMatches: WaitlistMatch[] = [];
  try {
    const apptDate = new Date(beforeAppt.startAt);
    const dayStart = new Date(apptDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(apptDate); dayEnd.setHours(23, 59, 59, 999);
    const candidates = await prisma.waitlistEntry.findMany({
      where: {
        status: 'WAITING',
        OR: [
          { employeeId: beforeAppt.employeeId, serviceId: beforeAppt.serviceId },
          { employeeId: beforeAppt.employeeId, serviceId: null },
          { employeeId: null, serviceId: beforeAppt.serviceId },
        ],
        AND: [
          {
            OR: [
              { preferredDate: null },
              { preferredDate: { gte: dayStart, lte: dayEnd } },
            ],
          },
        ],
      },
      take: 5,
      orderBy: { createdAt: 'asc' },
    });
    const bookingLink = `${env.PUBLIC_URL || 'https://barbar2026.vercel.app'}/book`;
    for (const c of candidates) {
      const { enabled, message } = await renderTemplate(beforeAppt.employeeId, 'slotAvailable', {
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        serviceName: beforeAppt.service.name,
        employeeName: beforeAppt.employee.user.fullName,
        startAt: beforeAppt.startAt,
        businessName: env.BUSINESS_NAME,
        bookingLink,
      });
      if (!enabled) continue;
      waitlistMatches.push({
        id: c.id,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        whatsappUrl: buildWhatsAppUrl(c.customerPhone, message),
        message,
      });
    }
  } catch { /* non-fatal */ }

  res.json({ ...cancelled, whatsapp, waitlistMatches });
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
        data: {
          totalVisits: { increment: 1 },
          loyaltyPoints: { increment: 1 },
        },
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

  const kind = (req.query.kind as TemplateKey) || 'confirm';
  const { message } = await renderTemplate(a.employeeId, kind, {
    customerName: a.customer.fullName,
    customerPhone: a.customer.phone,
    serviceName: a.service.name,
    employeeName: a.employee.user.fullName,
    startAt: a.startAt,
    businessName: env.BUSINESS_NAME,
    notes: a.notes,
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
