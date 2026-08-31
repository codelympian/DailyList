import { normalizeHeader, suggestMapping } from './columns';

describe('normalizeHeader', () => {
  it.each([
    ['Customer Name', 'customername'],
    ['PHONE_NUMBER', 'phonenumber'],
    ['Amount-Due ', 'amountdue'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeHeader(input)).toBe(expected);
  });
});

describe('suggestMapping', () => {
  it('maps the spec example headers', () => {
    const mapping = suggestMapping([
      'Customer Name',
      'Phone Number',
      'Product Purchased',
      'Amount',
      'Date Bought',
      'Amount Due',
    ]);
    expect(mapping).toEqual({
      name: 'Customer Name',
      phone: 'Phone Number',
      product: 'Product Purchased',
      amount: 'Amount',
      date: 'Date Bought',
      balance: 'Amount Due',
    });
  });

  it('maps alternative header spellings', () => {
    const mapping = suggestMapping(['Full Name', 'WhatsApp', 'Item', 'Price', 'Balance', 'Email']);
    expect(mapping.name).toBe('Full Name');
    expect(mapping.phone).toBe('WhatsApp');
    expect(mapping.product).toBe('Item');
    expect(mapping.amount).toBe('Price');
    expect(mapping.balance).toBe('Balance');
    expect(mapping.email).toBe('Email');
  });

  it('leaves unknown headers unmapped', () => {
    const mapping = suggestMapping(['Name', 'Favourite Colour']);
    expect(mapping).toEqual({ name: 'Name' });
  });

  it('never maps the same source column twice', () => {
    const mapping = suggestMapping(['Name']);
    const values = Object.values(mapping);
    expect(new Set(values).size).toBe(values.length);
  });
});
