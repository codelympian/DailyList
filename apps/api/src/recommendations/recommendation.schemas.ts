import { z } from 'zod';
import { RECOMMENDATION_CATEGORIES } from '@dailylist/scoring';

export const listRecommendationsQuerySchema = z.object({
  /** Defaults to today when omitted. */
  date: z.coerce.date().optional(),
  category: z.enum(RECOMMENDATION_CATEGORIES).optional(),
  status: z
    .enum(['PENDING', 'CONTACTED', 'COMPLETED', 'SKIPPED', 'DISMISSED', 'CONVERTED'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const updateRecommendationStatusSchema = z.object({
  status: z.enum(['CONTACTED', 'COMPLETED', 'SKIPPED', 'DISMISSED', 'CONVERTED']),
});

export type ListRecommendationsQuery = z.infer<typeof listRecommendationsQuerySchema>;
export type UpdateRecommendationStatusInput = z.infer<typeof updateRecommendationStatusSchema>;
