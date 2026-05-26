import { prisma } from '../../lib/prisma';

/**
 * Atomically assigns the next receipt number to a payment that just turned PAID
 * and doesn't yet have one. Idempotent: returns the existing number if already set.
 *
 * Israeli accountant requirement: receipt numbers must be sequential, no gaps,
 * no reuse. If a payment is later refunded, the number stays assigned.
 */
export async function assignReceiptNumber(paymentId: string): Promise<number> {
  return prisma.$transaction(
    async (tx) => {
      const p = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { receiptNumber: true },
      });
      if (!p) throw new Error('payment not found');
      if (p.receiptNumber != null) return p.receiptNumber;
      const max = await tx.payment.aggregate({ _max: { receiptNumber: true } });
      const next = (max._max.receiptNumber ?? 0) + 1;
      await tx.payment.update({ where: { id: paymentId }, data: { receiptNumber: next } });
      return next;
    },
    { isolationLevel: 'Serializable' },
  );
}
