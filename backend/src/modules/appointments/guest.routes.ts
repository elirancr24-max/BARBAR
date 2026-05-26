import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { createAppointment } from './appointments.service';
import { writeAudit } from '../../middleware/audit';
import { buildWhatsAppUrl, renderTemplate } from '../notifications/whatsapp';
import { env } from '../../config/env';
import { getPrimaryEmployeeId } from '../../lib/singleEmployee';

const router = Router();

const guestBookSchema = z.object({
  fullName: z.string().min(2, 'שם מלא נדרש'),
  phone: z.string().regex(/^[\d+\-\s]{9,15}$/, 'מספר טלפון לא תקין'),
  email: z.string().email().optional().or(z.literal('')),
  employeeId: z.string().optional(),
  serviceId: z.string(),
  startAt: z.coerce.date(),
  notes: z.string().optional(),
});

function normalizePhone(p: string): string {
  let n = p.replace(/[^\d]/g, '');
  if (n.startsWith('0')) n = '972' + n.slice(1);
  return n;
}

router.post('/', validate(guestBookSchema), async (req, res) => {
  const dto = req.body as z.infer<typeof guestBookSchema>;
  const phone = normalizePhone(dto.phone);
  const email = dto.email || `guest+${phone}@barbar.local`;

  // Find or create a guest customer user (matched by phone)
  let user = await prisma.user.findUnique({ where: { phone }, include: { customer: true } });
  if (user?.customer?.blocked) {
    return res.status(403).json({
      error: { code: 'CUSTOMER_BLOCKED', message: 'לא ניתן לקבוע תור. אנא צור קשר עם המספרה.' },
    });
  }
  if (!user) {
    const randomPwd = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    user = await prisma.user.create({
      data: {
        email,
        phone,
        fullName: dto.fullName,
        passwordHash: randomPwd,
        role: 'CUSTOMER',
        customer: { create: { notes: 'הזמנה כאורח' } },
      },
      include: { customer: true },
    });
  } else if (user.fullName !== dto.fullName) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { fullName: dto.fullName },
      include: { customer: true },
    });
  }
  if (!user) {
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'יצירת לקוח נכשלה' } });
  }

  const employeeId = dto.employeeId ?? (await getPrimaryEmployeeId());

  const appointment = await createAppointment({
    customerUserId: user.id,
    employeeId,
    serviceId: dto.serviceId,
    startAt: dto.startAt,
    notes: dto.notes,
  });

  await writeAudit({
    actorId: user.id,
    actorRole: 'CUSTOMER',
    action: 'appointment.create.guest',
    entityType: 'Appointment',
    entityId: appointment.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    after: { id: appointment.id, startAt: appointment.startAt },
  });

  // Build WhatsApp link FROM customer TO barber notifying about the new booking
  let barberWhatsapp: { url: string; message: string } | null = null;
  try {
    const { enabled, message } = await renderTemplate(appointment.employeeId, 'newBookingToBarber', {
      customerName: appointment.customer.fullName,
      customerPhone: appointment.customer.phone,
      serviceName: appointment.service.name,
      employeeName: appointment.employee.user.fullName,
      startAt: appointment.startAt,
      businessName: env.BUSINESS_NAME,
      notes: appointment.notes,
    });
    // Use barber's configured WhatsApp phone if set, else fall back to account phone
    const employeeRecord = await prisma.employee.findUnique({
      where: { id: appointment.employeeId },
      select: { whatsappPhone: true },
    });
    const targetPhone = employeeRecord?.whatsappPhone || appointment.employee.user.phone;
    if (enabled && targetPhone) {
      barberWhatsapp = {
        url: buildWhatsAppUrl(targetPhone, message),
        message,
      };
    }
  } catch { /* non-fatal */ }

  res.status(201).json({
    id: appointment.id,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    service: appointment.service.name,
    employee: appointment.employee.user.fullName,
    employeePhone: appointment.employee.user.phone,
    priceAgorot: appointment.priceAgorot,
    confirmation: appointment.confirmationCode || `BB-${appointment.id.slice(-6).toUpperCase()}`,
    barberWhatsapp,
  });
});

export default router;
