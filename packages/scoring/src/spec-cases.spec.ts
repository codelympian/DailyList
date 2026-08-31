import { computeIntelligence } from './segments';
import { DEFAULT_SETTINGS, type CustomerFeatureInput } from './types';

/**
 * The eight scenarios the product specification requires the intelligence
 * engine to get right. These are the guard rails for every later change.
 */

const NOW = new Date('2026-08-31T09:00:00.000Z');

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function customer(overrides: Partial<CustomerFeatureInput> = {}): CustomerFeatureInput {
  return {
    customerId: 'c1',
    name: 'Ada Okafor',
    hasPhone: true,
    purchaseCount: 0,
    totalSpend: 0,
    outstandingDebt: 0,
    lastPurchaseAt: null,
    previousPurchaseAt: null,
    firstPurchaseAt: null,
    lastContactedAt: null,
    productReorderIntervalDays: null,
    lastProductName: null,
    openLeadLastActivityAt: null,
    openLeadInterest: null,
    optedOut: false,
    ...overrides,
  };
}

const segmentsOf = (input: CustomerFeatureInput) =>
  computeIntelligence(input, DEFAULT_SETTINGS, NOW).segments.map((s) => s.segment);

describe('CASE 1: buys every 30 days, last purchase 32 days ago', () => {
  const input = customer({
    purchaseCount: 4,
    totalSpend: 40000,
    lastPurchaseAt: daysAgo(32),
    firstPurchaseAt: daysAgo(122), // 3 intervals of ~30 days
    productReorderIntervalDays: 30,
    lastProductName: 'Glow Serum',
  });

  it('is REORDER_DUE', () => {
    expect(segmentsOf(input)).toContain('REORDER_DUE');
  });

  it('explains the reason from real data', () => {
    const result = computeIntelligence(input, DEFAULT_SETTINGS, NOW);
    const match = result.segments.find((s) => s.segment === 'REORDER_DUE');
    expect(match?.reasonCodes).toContain('REORDER_DUE');
    expect(match?.facts.intervalDays).toBe(30);
    expect(match?.facts.daysSinceLastPurchase).toBe(32);
  });

  it('is eligible for follow-up (not suppressed)', () => {
    const result = computeIntelligence(input, DEFAULT_SETTINGS, NOW);
    expect(result.suppression.suppressed).toBe(false);
    expect(result.eligibleSegments.map((s) => s.segment)).toContain('REORDER_DUE');
  });
});

describe('CASE 2: customer opted out', () => {
  const input = customer({
    optedOut: true,
    purchaseCount: 4,
    totalSpend: 400000,
    outstandingDebt: 20000,
    lastPurchaseAt: daysAgo(60),
    firstPurchaseAt: daysAgo(240),
    productReorderIntervalDays: 30,
  });

  it('is never eligible for follow-up, despite matching segments', () => {
    const result = computeIntelligence(input, DEFAULT_SETTINGS, NOW);
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.suppression.suppressed).toBe(true);
    expect(result.suppression.codes).toContain('OPTED_OUT');
    expect(result.eligibleSegments).toEqual([]);
  });
});

describe('CASE 3: contacted yesterday, minimum interval 7 days', () => {
  const input = customer({
    purchaseCount: 3,
    totalSpend: 30000,
    lastPurchaseAt: daysAgo(40),
    firstPurchaseAt: daysAgo(100),
    productReorderIntervalDays: 30,
    lastContactedAt: daysAgo(1),
  });

  it('is suppressed by contact fatigue', () => {
    const result = computeIntelligence(input, DEFAULT_SETTINGS, NOW);
    expect(result.suppression.suppressed).toBe(true);
    expect(result.suppression.codes).toContain('RECENTLY_CONTACTED');
    expect(result.eligibleSegments).toEqual([]);
  });

  it('becomes eligible again after the interval passes', () => {
    const later = computeIntelligence(
      { ...input, lastContactedAt: daysAgo(8) },
      DEFAULT_SETTINGS,
      NOW,
    );
    expect(later.suppression.suppressed).toBe(false);
  });
});

describe('CASE 4: customer owes ₦20,000', () => {
  it('is a DEBTOR', () => {
    const result = computeIntelligence(
      customer({ outstandingDebt: 20000, purchaseCount: 1, lastPurchaseAt: daysAgo(30) }),
      DEFAULT_SETTINGS,
      NOW,
    );
    const match = result.segments.find((s) => s.segment === 'DEBTOR');
    expect(match).toBeDefined();
    expect(match?.facts.outstandingDebt).toBe(20000);
    expect(match?.reasonCodes).toContain('OUTSTANDING_BALANCE');
  });
});

describe('CASE 5: customer purchased today', () => {
  const input = customer({
    purchaseCount: 5,
    totalSpend: 50000,
    lastPurchaseAt: NOW,
    firstPurchaseAt: daysAgo(120),
    productReorderIntervalDays: 30,
  });

  it('is not reorder-due', () => {
    expect(segmentsOf(input)).not.toContain('REORDER_DUE');
  });

  it('is suppressed as recently purchased', () => {
    const result = computeIntelligence(input, DEFAULT_SETTINGS, NOW);
    expect(result.suppression.codes).toContain('PURCHASED_RECENTLY');
    expect(result.eligibleSegments).toEqual([]);
  });
});

describe('CASE 6: asked about a product 3 days ago, no purchase', () => {
  const input = customer({
    openLeadLastActivityAt: daysAgo(3),
    openLeadInterest: 'Glow Serum',
  });

  it('is a HOT_LEAD candidate', () => {
    const result = computeIntelligence(input, DEFAULT_SETTINGS, NOW);
    const match = result.segments.find((s) => s.segment === 'HOT_LEAD');
    expect(match).toBeDefined();
    expect(match?.reasonCodes).toEqual(['RECENT_INTEREST', 'NO_PURCHASE_YET']);
    expect(match?.facts.daysSinceInterest).toBe(3);
    expect(result.eligibleSegments.map((s) => s.segment)).toContain('HOT_LEAD');
  });

  it('stops being a hot lead once they buy', () => {
    const purchased = { ...input, purchaseCount: 1, lastPurchaseAt: daysAgo(1) };
    expect(segmentsOf(purchased)).not.toContain('HOT_LEAD');
  });

  it('stops being a hot lead when the interest goes stale', () => {
    const stale = { ...input, openLeadLastActivityAt: daysAgo(30) };
    expect(segmentsOf(stale)).not.toContain('HOT_LEAD');
  });
});

describe('CASE 7: lifetime spend exceeds the VIP threshold', () => {
  it('is a VIP', () => {
    const result = computeIntelligence(
      customer({
        purchaseCount: 6,
        totalSpend: 150000,
        lastPurchaseAt: daysAgo(20),
        firstPurchaseAt: daysAgo(200),
      }),
      DEFAULT_SETTINGS,
      NOW,
    );
    const match = result.segments.find((s) => s.segment === 'VIP');
    expect(match).toBeDefined();
    expect(match?.facts.threshold).toBe(DEFAULT_SETTINGS.vipLifetimeSpend);
  });

  it('respects a business-specific threshold', () => {
    const input = customer({ purchaseCount: 1, totalSpend: 150000, lastPurchaseAt: daysAgo(20) });
    const strict = computeIntelligence(
      input,
      { ...DEFAULT_SETTINGS, vipLifetimeSpend: 500000 },
      NOW,
    );
    expect(strict.segments.map((s) => s.segment)).not.toContain('VIP');
  });
});

describe('CASE 8: no purchase history and no lead activity', () => {
  it('produces no segments and is not recommended', () => {
    const result = computeIntelligence(customer(), DEFAULT_SETTINGS, NOW);
    expect(result.segments).toEqual([]);
    expect(result.eligibleSegments).toEqual([]);
    expect(result.suppression.codes).toContain('NO_ACTIVITY');
    expect(result.lifecycleStage).toBe('LEAD');
  });
});
