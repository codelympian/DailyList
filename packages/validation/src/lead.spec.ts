import { createLeadSchema, updateLeadSchema, updateLeadStatusSchema } from './lead';

const customerId = '11111111-2222-4333-8444-555555555555';
const productId = '22222222-3333-4444-8555-666666666666';

describe('createLeadSchema', () => {
  it('accepts a lead with a product', () => {
    const result = createLeadSchema.parse({ customerId, productId, estimatedValue: 18000 });
    expect(result.productId).toBe(productId);
    expect(result.estimatedValue).toBe(18000);
  });

  it('accepts a lead with only a description', () => {
    const result = createLeadSchema.parse({ customerId, description: 'Asked about serum' });
    expect(result.description).toBe('Asked about serum');
  });

  it('rejects a lead with neither product nor description', () => {
    expect(createLeadSchema.safeParse({ customerId }).success).toBe(false);
  });

  it('treats empty productId string as absent', () => {
    const result = createLeadSchema.safeParse({ customerId, productId: '', description: 'x' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.productId).toBeUndefined();
  });

  it('rejects negative estimated value', () => {
    expect(
      createLeadSchema.safeParse({ customerId, description: 'x', estimatedValue: -5 }).success,
    ).toBe(false);
  });
});

describe('updateLeadSchema', () => {
  it('allows nulling fields', () => {
    const result = updateLeadSchema.parse({ productId: null, estimatedValue: null });
    expect(result.productId).toBeNull();
    expect(result.estimatedValue).toBeNull();
  });
});

describe('updateLeadStatusSchema', () => {
  it.each(['NEW', 'CONTACTED', 'INTERESTED', 'QUOTED', 'NEGOTIATING', 'WON', 'LOST'])(
    'accepts %s',
    (status) => {
      expect(updateLeadStatusSchema.safeParse({ status }).success).toBe(true);
    },
  );

  it('rejects unknown statuses', () => {
    expect(updateLeadStatusSchema.safeParse({ status: 'MAYBE' }).success).toBe(false);
  });
});
