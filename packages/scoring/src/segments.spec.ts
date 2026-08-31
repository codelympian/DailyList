import { extractFeatures } from './features';
import { computeIntelligence, computeLifecycleStage, computeSegments } from './segments';
import { explainSegment, explainSuppression } from './explain';
import { DEFAULT_SETTINGS, type CustomerFeatureInput } from './types';

const NOW = new Date('2026-08-31T09:00:00.000Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

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

const features = (input: CustomerFeatureInput) => extractFeatures(input, DEFAULT_SETTINGS, NOW);

describe('feature extraction', () => {
  it('prefers the product reorder interval', () => {
    const f = features(
      customer({
        purchaseCount: 3,
        lastPurchaseAt: daysAgo(10),
        firstPurchaseAt: daysAgo(200),
        productReorderIntervalDays: 30,
      }),
    );
    expect(f.expectedReorderIntervalDays).toBe(30);
    expect(f.reorderIntervalSource).toBe('PRODUCT');
  });

  it('falls back to the customer purchase rhythm', () => {
    const f = features(
      customer({ purchaseCount: 5, lastPurchaseAt: daysAgo(5), firstPurchaseAt: daysAgo(85) }),
    );
    expect(f.averagePurchaseIntervalDays).toBe(20); // 80 days over 4 intervals
    expect(f.expectedReorderIntervalDays).toBe(20);
    expect(f.reorderIntervalSource).toBe('HISTORY');
  });

  it('falls back to the business default with a single purchase', () => {
    const f = features(customer({ purchaseCount: 1, lastPurchaseAt: daysAgo(5) }));
    expect(f.expectedReorderIntervalDays).toBe(DEFAULT_SETTINGS.defaultReorderIntervalDays);
    expect(f.reorderIntervalSource).toBe('DEFAULT');
  });

  it('computes days until the reorder is due', () => {
    const f = features(
      customer({ purchaseCount: 1, lastPurchaseAt: daysAgo(20), productReorderIntervalDays: 30 }),
    );
    expect(f.daysUntilReorderDue).toBe(10);
  });

  it('has no reorder expectation without purchases', () => {
    const f = features(customer());
    expect(f.expectedReorderIntervalDays).toBeNull();
    expect(f.reorderIntervalSource).toBeNull();
  });
});

describe('reorder rule boundaries', () => {
  const base = (days: number) =>
    customer({ purchaseCount: 2, lastPurchaseAt: daysAgo(days), productReorderIntervalDays: 30 });
  const has = (days: number) =>
    computeSegments(features(base(days)), DEFAULT_SETTINGS).some(
      (s) => s.segment === 'REORDER_DUE',
    );

  it('is not due well before the interval', () => {
    expect(has(20)).toBe(false);
  });

  it('is due at 90% of the interval (near due)', () => {
    expect(has(27)).toBe(true);
  });

  it('is due past the interval', () => {
    expect(has(35)).toBe(true);
  });

  it('yields to LOST_CUSTOMER once far past due', () => {
    const segments = computeSegments(features(base(95)), DEFAULT_SETTINGS).map((s) => s.segment);
    expect(segments).toContain('LOST_CUSTOMER');
    expect(segments).not.toContain('REORDER_DUE');
  });
});

describe('lost customer rule', () => {
  it('uses the reorder interval multiple when known', () => {
    // 30-day product interval × 3 = 90 days
    const justUnder = computeSegments(
      features(
        customer({ purchaseCount: 2, lastPurchaseAt: daysAgo(89), productReorderIntervalDays: 30 }),
      ),
      DEFAULT_SETTINGS,
    ).map((s) => s.segment);
    const atThreshold = computeSegments(
      features(
        customer({ purchaseCount: 2, lastPurchaseAt: daysAgo(90), productReorderIntervalDays: 30 }),
      ),
      DEFAULT_SETTINGS,
    ).map((s) => s.segment);
    expect(justUnder).not.toContain('LOST_CUSTOMER');
    expect(atThreshold).toContain('LOST_CUSTOMER');
  });

  it('uses the business default when no interval is known', () => {
    const segments = computeSegments(
      features(customer({ purchaseCount: 1, lastPurchaseAt: daysAgo(95) })),
      DEFAULT_SETTINGS,
    ).map((s) => s.segment);
    expect(segments).toContain('LOST_CUSTOMER');
  });
});

describe('overlapping segments', () => {
  it('a customer can be VIP, repeat, debtor and reorder-due at once', () => {
    const result = computeIntelligence(
      customer({
        purchaseCount: 8,
        totalSpend: 250000,
        outstandingDebt: 15000,
        lastPurchaseAt: daysAgo(35),
        firstPurchaseAt: daysAgo(245),
        productReorderIntervalDays: 30,
      }),
      DEFAULT_SETTINGS,
      NOW,
    );
    const segments = result.segments.map((s) => s.segment);
    expect(segments).toEqual(
      expect.arrayContaining(['REORDER_DUE', 'DEBTOR', 'REPEAT_CUSTOMER', 'VIP']),
    );
  });
});

describe('suppression', () => {
  it('suppresses a customer with no phone number', () => {
    const result = computeIntelligence(
      customer({
        hasPhone: false,
        outstandingDebt: 5000,
        purchaseCount: 1,
        lastPurchaseAt: daysAgo(30),
      }),
      DEFAULT_SETTINGS,
      NOW,
    );
    expect(result.suppression.codes).toContain('NO_CONTACT_METHOD');
    expect(result.eligibleSegments).toEqual([]);
  });

  it('still chases debt right after a purchase', () => {
    const result = computeIntelligence(
      customer({ purchaseCount: 1, lastPurchaseAt: NOW, outstandingDebt: 20000 }),
      DEFAULT_SETTINGS,
      NOW,
    );
    expect(result.suppression.codes).not.toContain('PURCHASED_RECENTLY');
    expect(result.eligibleSegments.map((s) => s.segment)).toContain('DEBTOR');
  });

  it('honours a business-specific contact interval', () => {
    const input = customer({
      purchaseCount: 2,
      lastPurchaseAt: daysAgo(40),
      productReorderIntervalDays: 30,
      lastContactedAt: daysAgo(10),
    });
    const relaxed = computeIntelligence(input, DEFAULT_SETTINGS, NOW);
    const strict = computeIntelligence(
      input,
      { ...DEFAULT_SETTINGS, minContactIntervalDays: 30 },
      NOW,
    );
    expect(relaxed.suppression.suppressed).toBe(false);
    expect(strict.suppression.codes).toContain('RECENTLY_CONTACTED');
  });
});

describe('lifecycle stage', () => {
  it.each([
    ['LEAD', customer()],
    [
      'CUSTOMER',
      customer({ purchaseCount: 2, lastPurchaseAt: daysAgo(5), productReorderIntervalDays: 30 }),
    ],
    [
      'INACTIVE',
      customer({ purchaseCount: 2, lastPurchaseAt: daysAgo(45), productReorderIntervalDays: 30 }),
    ],
    [
      'LOST',
      customer({ purchaseCount: 2, lastPurchaseAt: daysAgo(120), productReorderIntervalDays: 30 }),
    ],
  ])('classifies %s', (expected, input) => {
    expect(computeLifecycleStage(features(input), DEFAULT_SETTINGS)).toBe(expected);
  });
});

describe('explanations', () => {
  it('renders reorder reasons from measured facts', () => {
    const result = computeIntelligence(
      customer({
        purchaseCount: 4,
        lastPurchaseAt: daysAgo(32),
        firstPurchaseAt: daysAgo(122),
        lastProductName: 'Glow Serum',
      }),
      DEFAULT_SETTINGS,
      NOW,
    );
    const match = result.segments.find((s) => s.segment === 'REORDER_DUE')!;
    const lines = explainSegment(match, 'Ada Okafor');
    expect(lines[0]).toBe('Ada normally buys every 30 days');
    expect(lines[1]).toBe('Last purchase of Glow Serum was 32 days ago');
  });

  it('renders debt in naira', () => {
    const result = computeIntelligence(
      customer({ outstandingDebt: 20000, purchaseCount: 1, lastPurchaseAt: daysAgo(20) }),
      DEFAULT_SETTINGS,
      NOW,
    );
    const match = result.segments.find((s) => s.segment === 'DEBTOR')!;
    expect(explainSegment(match, 'Ada Okafor')[0]).toBe('Owes ₦20,000');
  });

  it('explains suppression in plain language', () => {
    expect(explainSuppression('OPTED_OUT')).toBe('Opted out of messages');
    expect(explainSuppression('RECENTLY_CONTACTED')).toContain('Contacted recently');
  });
});

describe('determinism', () => {
  it('returns identical results for identical inputs', () => {
    const input = customer({
      purchaseCount: 3,
      totalSpend: 120000,
      outstandingDebt: 5000,
      lastPurchaseAt: daysAgo(40),
      firstPurchaseAt: daysAgo(130),
      openLeadLastActivityAt: daysAgo(2),
    });
    const a = computeIntelligence(input, DEFAULT_SETTINGS, NOW);
    const b = computeIntelligence(input, DEFAULT_SETTINGS, NOW);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
