import { z } from 'zod';
import { moneySchema } from './product';

export const paymentMethodSchema = z.enum(['CASH', 'TRANSFER', 'POS', 'CARD', 'OTHER']);

const transactionItemSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  quantity: z.coerce.number().int().min(1).max(100000),
  unitPrice: moneySchema,
});

export const createTransactionSchema = z
  .object({
    customerId: z.string().uuid('Select a customer'),
    items: z.array(transactionItemSchema).min(1, 'Add at least one item').max(50),
    amountPaid: moneySchema.default(0),
    occurredAt: z.coerce.date().optional(),
    paymentMethod: paymentMethodSchema.optional(),
    notes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
  })
  .superRefine((value, ctx) => {
    const total = value.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    if (value.amountPaid - total > 0.005) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amountPaid'],
        message: 'Amount paid cannot exceed the transaction total',
      });
    }
    for (const [index, item] of value.items.entries()) {
      if (!item.productId && !item.description) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'description'],
          message: 'Pick a product or enter a description',
        });
      }
    }
  });

export const recordPaymentSchema = z.object({
  amount: moneySchema.refine((value) => value > 0, { message: 'Payment must be greater than 0' }),
  method: paymentMethodSchema.optional(),
  occurredAt: z.coerce.date().optional(),
});

export const updateTransactionStatusSchema = z.object({
  status: z.enum(['REFUNDED', 'CANCELLED']),
});

export const listTransactionsQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  status: z.enum(['PAID', 'PARTIALLY_PAID', 'UNPAID', 'REFUNDED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
/** Form-side type (before defaults are applied) for react-hook-form. */
export type CreateTransactionFormInput = z.input<typeof createTransactionSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type UpdateTransactionStatusInput = z.infer<typeof updateTransactionStatusSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
