import { z } from 'zod';

/** Money amount: non-negative, at most 2 decimal places, sane upper bound. */
export const moneySchema = z
  .number()
  .nonnegative('Amount cannot be negative')
  .max(999_999_999, 'Amount is too large')
  .refine(
    (value) =>
      Number.isInteger(Math.round(value * 100)) &&
      Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
    {
      message: 'Use at most 2 decimal places',
    },
  );

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Enter the product name').max(120),
  sku: optionalText(60),
  category: optionalText(60),
  price: moneySchema,
  costPrice: moneySchema.optional(),
  reorderIntervalDays: z.coerce
    .number()
    .int('Whole number of days')
    .min(1)
    .max(3650)
    .optional()
    .or(z.nan().transform(() => undefined)),
  active: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = z.object({
  search: optionalText(120),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
