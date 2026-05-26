import { prisma } from './prisma';
import { logger } from './logger';

export interface BusinessSettingsRow {
  id: string;
  requireDeposit: boolean;
  depositAgorot: number;
  depositMethod: 'BIT_LINK' | 'TRANZILA' | 'BOTH';
  bitPhone: string | null;
  noShowThreshold: number;
  autoReminder24h: boolean;
  allowSelfCancel: boolean;
  selfCancelCutoffHr: number;
}

/**
 * Reads BusinessSettings via raw SQL so this module stays decoupled from
 * whichever schema migration introduces the table (Agent C owns it).
 * Returns null if the table doesn't exist yet or the row is missing.
 */
export async function getBusinessSettings(): Promise<BusinessSettingsRow | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<BusinessSettingsRow[]>(
      `SELECT "id", "requireDeposit", "depositAgorot", "depositMethod",
              "bitPhone", "noShowThreshold", "autoReminder24h",
              "allowSelfCancel", "selfCancelCutoffHr"
         FROM "BusinessSettings"
        WHERE "id" = 'singleton'
        LIMIT 1`,
    );
    return rows[0] ?? null;
  } catch (err) {
    logger.debug({ err }, 'BusinessSettings unavailable (table may not exist yet)');
    return null;
  }
}
