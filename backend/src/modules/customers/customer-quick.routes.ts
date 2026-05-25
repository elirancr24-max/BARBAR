import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

const quickSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().regex(/^[\d+\-\s]{9,15}$/),
  email: z.string().email().optional().or(z.literal('')),
});

function normalizePhone(p: string): string {
  let n = p.replace(/[^\d]/g, '');
  if (n.startsWith('0')) n = '972' + n.slice(1);
  return n;
}

/**
 * POST /customers/quick — admin/barber creates or fetches a customer by phone.
 * Returns userId so a follow-up POST /appointments can use it.
 */
router.post(
  '/quick',
  requireAuth,
  requireRole('ADMIN', 'BARBER'),
  validate(quickSchema),
  async (req, res) => {
    const { fullName, phone, email } = req.body as z.infer<typeof quickSchema>;
    const normalized = normalizePhone(phone);
    const fallbackEmail = email || `guest+${normalized}@barabargil.local`;

    let user = await prisma.user.findUnique({ where: { phone: normalized } });
    if (!user) {
      const pwd = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      user = await prisma.user.create({
        data: {
          email: fallbackEmail,
          phone: normalized,
          fullName,
          passwordHash: pwd,
          role: 'CUSTOMER',
          customer: { create: { notes: 'נוצר על ידי הצוות' } },
        },
      });
    } else if (user.fullName !== fullName) {
      user = await prisma.user.update({ where: { id: user.id }, data: { fullName } });
    }

    res.json({
      userId: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
    });
  },
);

export default router;
