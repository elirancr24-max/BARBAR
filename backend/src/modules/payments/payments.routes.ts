import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import { getPaymentProvider } from './provider';
import { NotFound } from '../../lib/errors';

const router = Router();

router.post(
  '/charge',
  requireAuth,
  validate(z.object({
    appointmentId: z.string(),
    tipAgorot: z.number().int().min(0).optional(),
  })),
  async (req, res, next) => {
    const a = await prisma.appointment.findUnique({
      where: { id: req.body.appointmentId },
      include: { customer: true, service: true },
    });
    if (!a) return next(NotFound('תור לא נמצא'));

    const tipAgorot = Number(req.body.tipAgorot) || 0;
    const provider = getPaymentProvider();
    const result = await provider.charge({
      appointmentId: a.id,
      amountAgorot: a.priceAgorot + tipAgorot,
      customerEmail: a.customer.email,
      customerPhone: a.customer.phone,
      description: a.service.name,
    });

    const payment = await prisma.payment.upsert({
      where: { appointmentId: a.id },
      create: {
        appointmentId: a.id,
        amountAgorot: a.priceAgorot,
        tipAgorot,
        provider: provider.name,
        providerRef: result.providerRef,
        status: provider.name === 'mock' ? 'PAID' : 'PENDING',
        paidAt: provider.name === 'mock' ? new Date() : null,
      },
      update: {
        tipAgorot,
        provider: provider.name,
        providerRef: result.providerRef,
        status: provider.name === 'mock' ? 'PAID' : 'PENDING',
        paidAt: provider.name === 'mock' ? new Date() : null,
      },
    });

    await auditFromReq(req, 'payment.charge', 'Payment', payment.id, null, payment);
    res.json({ payment, redirectUrl: result.redirectUrl });
  },
);

router.post('/webhook', async (req, res) => {
  // Tranzila callback — real impl would verify signature & match providerRef
  const { providerRef, status } = req.body as { providerRef?: string; status?: string };
  if (!providerRef) return res.status(400).end();
  await prisma.payment.updateMany({
    where: { providerRef },
    data: {
      status: status === 'success' ? 'PAID' : 'FAILED',
      paidAt: status === 'success' ? new Date() : null,
    },
  });
  res.json({ ok: true });
});

export default router;
