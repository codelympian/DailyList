import { normalizeRow, parseDate, parseMoney } from './normalize';
import type { ImportMapping } from './types';

const mapping: ImportMapping = {
  name: 'Name',
  phone: 'Phone',
  email: 'Email',
  product: 'Product',
  amount: 'Amount',
  balance: 'Balance',
  date: 'Date',
};

describe('normalizeRow', () => {
  it('normalizes a complete valid row', () => {
    const { normalized, errors } = normalizeRow(
      {
        Name: ' Ada Okafor ',
        Phone: '0801 234 5678',
        Email: 'ADA@Example.com',
        Product: 'Glow Serum',
        Amount: '₦18,000',
        Balance: '5,000',
        Date: '15/07/2026',
      },
      mapping,
    );
    expect(errors).toHaveLength(0);
    expect(normalized).toEqual({
      name: 'Ada Okafor',
      phone: '+2348012345678',
      email: 'ada@example.com',
      product: 'Glow Serum',
      amount: '18000.00',
      balance: '5000.00',
      date: new Date(Date.UTC(2026, 6, 15)).toISOString(),
    });
  });

  it('requires a name', () => {
    const { errors } = normalizeRow({ Phone: '08012345678' }, mapping);
    expect(errors).toEqual([{ field: 'name', message: 'Name is required' }]);
  });

  it('flags an invalid phone', () => {
    const { errors } = normalizeRow({ Name: 'X', Phone: '12345' }, mapping);
    expect(errors.some((e) => e.field === 'phone')).toBe(true);
  });

  it('flags balance greater than amount', () => {
    const { errors } = normalizeRow({ Name: 'X', Amount: '1000', Balance: '2000' }, mapping);
    expect(errors.some((e) => e.field === 'balance')).toBe(true);
  });

  it('flags balance without amount', () => {
    const { errors } = normalizeRow({ Name: 'X', Balance: '2000' }, mapping);
    expect(errors.some((e) => e.field === 'balance')).toBe(true);
  });

  it('treats empty cells as absent, not invalid', () => {
    const { normalized, errors } = normalizeRow(
      { Name: 'X', Phone: '', Amount: '  ', Email: '' },
      mapping,
    );
    expect(errors).toHaveLength(0);
    expect(normalized.phone).toBeUndefined();
    expect(normalized.amount).toBeUndefined();
  });
});

describe('parseMoney', () => {
  it.each([
    ['18000', '18000.00'],
    ['18,000.50', '18000.50'],
    ['₦18,000', '18000.00'],
    ['NGN 2500', '2500.00'],
    ['0', '0.00'],
  ])('parses %s as %s', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each([['abc'], ['-50'], ['10.999'], ['1e5']])('rejects %s', (input) => {
    expect(parseMoney(input)).toBeNull();
  });
});

describe('parseDate', () => {
  it('parses ISO dates', () => {
    expect(parseDate('2026-07-15')).toBe(new Date('2026-07-15').toISOString());
  });

  it('parses day-first dates (Nigerian convention)', () => {
    expect(parseDate('15/07/2026')).toBe(new Date(Date.UTC(2026, 6, 15)).toISOString());
    expect(parseDate('1-8-26')).toBe(new Date(Date.UTC(2026, 7, 1)).toISOString());
  });

  it('parses Excel serial dates', () => {
    // 45000 = 2023-03-15
    expect(parseDate('45000')).toBe(new Date(Date.UTC(2023, 2, 15)).toISOString());
  });

  it.each([['31/02/2026'], ['not a date'], ['99/99/99'], ['2050-01-01']])('rejects %s', (input) => {
    expect(parseDate(input)).toBeNull();
  });
});
