import { z } from 'zod';
import { normalizePhone } from './phone';

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

const phoneField = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value))
  .superRefine((value, ctx) => {
    if (value === undefined) return;
    const result = normalizePhone(value);
    if (!result.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error ?? 'Invalid phone number',
      });
    }
  });

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((value) => (value === '' ? undefined : value))
  .superRefine((value, ctx) => {
    if (value === undefined) return;
    if (!z.string().email().max(254).safeParse(value).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid email address' });
    }
  });

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Enter the customer name').max(120),
  phone: phoneField,
  email: emailField,
  notes: optionalTrimmed(2000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Enter the customer name').max(120).optional(),
  phone: phoneField.or(z.null()),
  email: emailField.or(z.null()),
  notes: optionalTrimmed(2000).or(z.null()),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const listCustomersQuerySchema = z.object({
  search: optionalTrimmed(120),
  tag: optionalTrimmed(40),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
