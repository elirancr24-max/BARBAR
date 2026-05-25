import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { createAppointment } from './appointments.service';
import { writeAudit } from '../../middleware/audit';

const router = Router();

const guestBookSchema = z.object({
  fullName: z.string().min(2, 'שם מלא נדרש'),
  phone: z.string().regex(/^[\d+\-\s]{9,15}$/, 'מספר טלפון לא תקין'),
  email: z.string().email().optional().or(z.literal('')),
  employeeId: z.string(),
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
  let user = await prisma.user.findUnique({ where: { phone } });
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
    });
  } else if (user.fullName !== dto.fullName) {
    user = await prisma.user.update({ where: { id: user.id }, data: { fullName: dto.fullName } });
  }

  const appointment = await createAppointment({
    customerUserId: user.id,
    employeeId: dto.employeeId,
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

  res.status(201).json({
    id: appointment.id,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    service: appointment.service.name,
    employee: appointment.employee.user.fullName,
    priceAgorot: appointment.priceAgorot,
    confirmation: appointment.confirmationCode || `BB-${appointment.id.slice(-6).toUpperCase()}`,
  });
});

export default router;
