import { z } from 'zod';
import { SEGMENTS } from '@dailylist/scoring';

export const updateSettingsSchema = z
  .object({
    vipLifetimeSpend: z.number().nonnegative().max(999_999_999),
    repeatCustomerMinPurchases: z.number().int().min(1).max(100),
    defaultReorderIntervalDays: z.number().int().min(1).max(3650),
    reorderDuePercent: z.number().int().min(10).max(200),
    lostReorderMultiple: z.number().int().min(1).max(20),
    lostCustomerDays: z.number().int().min(1).max(3650),
    hotLeadRecencyDays: z.number().int().min(1).max(365),
    minContactIntervalDays: z.number().int().min(0).max(365),
    recentPurchaseSuppressionDays: z.number().int().min(0).max(365),
    dailyListSize: z.number().int().min(1).max(100),
  })
  .partial();

export const listSegmentQuerySchema = z.object({
  segment: z.enum(SEGMENTS).optional(),
  includeSuppressed: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const optOutSchema = z.object({
  channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL']).default('WHATSAPP'),
  optedIn: z.boolean(),
  source: z.string().trim().max(120).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type ListSegmentQuery = z.infer<typeof listSegmentQuerySchema>;
export type OptOutInput = z.infer<typeof optOutSchema>;
