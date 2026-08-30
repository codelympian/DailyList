import { z } from 'zod';

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2, 'Enter your business name').max(120),
  industry: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
