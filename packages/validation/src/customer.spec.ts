import { createCustomerSchema, listCustomersQuerySchema, updateCustomerSchema } from './customer';

describe('createCustomerSchema', () => {
  it('accepts a minimal valid customer', () => {
    const result = createCustomerSchema.parse({ name: 'Ada Okafor' });
    expect(result.name).toBe('Ada Okafor');
    expect(result.phone).toBeUndefined();
  });

  it('accepts a Nigerian phone in local format (normalization happens in the service)', () => {
    const result = createCustomerSchema.parse({ name: 'Ada', phone: '08012345678' });
    expect(result.phone).toBe('08012345678');
  });

  it('rejects an invalid phone with the normalizer message', () => {
    const result = createCustomerSchema.safeParse({ name: 'Ada', phone: '12345' });
    expect(result.success).toBe(false);
  });

  it('lowercases email and treats empty strings as undefined', () => {
    const result = createCustomerSchema.parse({
      name: 'Ada',
      email: 'ADA@Example.COM',
      phone: '',
      notes: '',
    });
    expect(result.email).toBe('ada@example.com');
    expect(result.phone).toBeUndefined();
    expect(result.notes).toBeUndefined();
  });

  it('rejects invalid email', () => {
    expect(createCustomerSchema.safeParse({ name: 'Ada', email: 'nope' }).success).toBe(false);
  });
});

describe('updateCustomerSchema', () => {
  it('allows explicit null to clear phone/email/notes', () => {
    const result = updateCustomerSchema.parse({ phone: null, email: null, notes: null });
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
  });

  it('validates a replacement phone', () => {
    expect(updateCustomerSchema.safeParse({ phone: 'garbage' }).success).toBe(false);
  });
});

describe('listCustomersQuerySchema', () => {
  it('applies defaults and coerces numbers', () => {
    const result = listCustomersQuerySchema.parse({ page: '2', pageSize: '50' });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(50);
  });

  it('caps pageSize at 100', () => {
    expect(listCustomersQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });
});
