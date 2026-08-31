import { createProductSchema } from './product';
import { createTransactionSchema, recordPaymentSchema } from './transaction';

const customerId = '11111111-2222-4333-8444-555555555555';

describe('createProductSchema', () => {
  it('accepts a valid product', () => {
    const result = createProductSchema.parse({
      name: 'Glow Serum',
      price: 18000,
      reorderIntervalDays: 30,
    });
    expect(result.price).toBe(18000);
    expect(result.reorderIntervalDays).toBe(30);
  });

  it('rejects negative prices and >2dp amounts', () => {
    expect(createProductSchema.safeParse({ name: 'X', price: -5 }).success).toBe(false);
    expect(createProductSchema.safeParse({ name: 'X', price: 10.999 }).success).toBe(false);
  });

  it('accepts 2dp prices', () => {
    expect(createProductSchema.safeParse({ name: 'X', price: 10.99 }).success).toBe(true);
  });
});

describe('createTransactionSchema', () => {
  const base = {
    customerId,
    items: [{ description: 'Glow Serum', quantity: 2, unitPrice: 9000 }],
  };

  it('accepts a valid transaction', () => {
    const result = createTransactionSchema.parse(base);
    expect(result.amountPaid).toBe(0);
    expect(result.items).toHaveLength(1);
  });

  it('rejects amountPaid greater than the item total', () => {
    const result = createTransactionSchema.safeParse({ ...base, amountPaid: 20000 });
    expect(result.success).toBe(false);
  });

  it('accepts amountPaid equal to the total', () => {
    expect(createTransactionSchema.safeParse({ ...base, amountPaid: 18000 }).success).toBe(true);
  });

  it('requires a product or description per item', () => {
    const result = createTransactionSchema.safeParse({
      customerId,
      items: [{ quantity: 1, unitPrice: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it('requires at least one item', () => {
    expect(createTransactionSchema.safeParse({ customerId, items: [] }).success).toBe(false);
  });
});

describe('recordPaymentSchema', () => {
  it('rejects a zero payment', () => {
    expect(recordPaymentSchema.safeParse({ amount: 0 }).success).toBe(false);
  });

  it('accepts a positive payment', () => {
    expect(recordPaymentSchema.safeParse({ amount: 5000.5 }).success).toBe(true);
  });
});
