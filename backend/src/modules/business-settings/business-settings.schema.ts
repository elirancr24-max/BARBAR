import { z } from 'zod';

export const taxStatusEnum = z.enum(['OSEK_MURSHE', 'OSEK_PATUR', 'UNKNOWN']);
export const depositMethodEnum = z.enum(['BIT_LINK', 'TRANZILA', 'BOTH']);

export const updateBusinessSettingsSchema = z
  .object({
    businessName: z.string().min(1).max(120).optional(),
    businessAddress: z.string().max(300).nullable().optional(),
    businessTaxId: z.string().max(40).nullable().optional(),
    taxStatus: taxStatusEnum.optional(),
    vatRate: z.number().int().min(0).max(100).optional(),
    requireDeposit: z.boolean().optional(),
    depositAgorot: z.number().int().min(0).optional(),
    depositMethod: depositMethodEnum.optional(),
    bitPhone: z.string().max(40).nullable().optional(),
    noShowThreshold: z.number().int().min(0).optional(),
    autoReminder24h: z.boolean().optional(),
    allowSelfCancel: z.boolean().optional(),
    selfCancelCutoffHr: z.number().int().min(0).max(168).optional(),
    defaultCommissionPct: z.number().int().min(0).max(100).optional(),
    slotIntervalMin: z
      .number()
      .int()
      .refine((v) => [15, 20, 30].includes(v), 'Must be 15, 20 or 30')
      .optional(),
    // Mini-site editable copy
    businessPhone: z.string().max(40).nullable().optional(),
    heroTitle: z.string().max(200).nullable().optional(),
    heroSubtitle: z.string().max(300).nullable().optional(),
    aboutStory: z.string().max(5000).nullable().optional(),
    instagramUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    facebookUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    mapEmbedUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    businessHours: z.string().max(500).nullable().optional(),
    // Consumer protection (Agent Q) — חוק הגנת הצרכן
    cancellationPolicyText: z.string().max(10000).nullable().optional(),
    refundPolicyText: z.string().max(10000).nullable().optional(),
  })
  .strict();

export type UpdateBusinessSettingsDto = z.infer<typeof updateBusinessSettingsSchema>;
