import { amountDue, deriveStatus, itemsTotal, money, toDecimal } from './money';

describe('money helpers (deterministic financial math)', () => {
  it('computes amount due: ₦50,000 with ₦30,000 paid → ₦20,000', () => {
    expect(amountDue(50000, 30000).toFixed(2)).toBe('20000.00');
  });

  it('never returns negative due (overpayment floors at 0)', () => {
    expect(amountDue(100, 150).toFixed(2)).toBe('0.00');
  });

  it('derives UNPAID when nothing is paid', () => {
    expect(deriveStatus(50000, 0)).toBe('UNPAID');
  });

  it('derives PARTIALLY_PAID for partial payment', () => {
    expect(deriveStatus(50000, 30000)).toBe('PARTIALLY_PAID');
  });

  it('derives PAID when fully (or over) paid', () => {
    expect(deriveStatus(50000, 50000)).toBe('PAID');
    expect(deriveStatus(50000, 60000)).toBe('PAID');
  });

  it('sums items without floating point drift', () => {
    // 0.1 + 0.2 style traps: 3 × 19.99 = 59.97 exactly.
    const total = itemsTotal([
      { quantity: 3, unitPrice: 19.99 },
      { quantity: 1, unitPrice: 0.03 },
    ]);
    expect(total.toFixed(2)).toBe('60.00');
  });

  it('rounds to 2 decimal places consistently', () => {
    expect(money(10.005)).toBe('10.01');
    expect(toDecimal('99.999').toFixed(2)).toBe('100.00');
  });
});
