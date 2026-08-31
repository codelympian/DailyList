import { z } from 'zod';
import { moneySchema } from './product';

export const leadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'QUOTED',
  'NEGOTIATING',
  'WON',
  'LOST',
]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

export const createLeadSchema = z
  .object({
    customerId: z.string().uuid('Select a customer'),
    productId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    description: optionalText(200),
    estimatedValue: moneySchema.optional().or(z.nan().transform(() => undefined)),
    notes: optionalText(2000),
  })
  .superRefine((value, ctx) => {
    if (!value.productId && !value.description) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'Pick a product or describe what they want',
      });
    }
  });

export const updateLeadSchema = z.object({
  productId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal('').transform(() => undefined))
    .or(z.null()),
  description: optionalText(200).or(z.null()),
  estimatedValue: moneySchema
    .optional()
    .or(z.nan().transform(() => undefined))
    .or(z.null()),
  notes: optionalText(2000).or(z.null()),
});

export const updateLeadStatusSchema = z.object({
  status: leadStatusSchema,
});

export const listLeadsQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  status: leadStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type LeadStatusValue = z.infer<typeof leadStatusSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
