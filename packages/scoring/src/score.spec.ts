import { extractFeatures } from './features';
import { computeSegments, computeIntelligence } from './segments';
import { pickCategory, rankCandidates, scoreCandidate } from './score';
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

function score(input: CustomerFeatureInput) {
  const features = extractFeatures(input, DEFAULT_SETTINGS, NOW);
  const segments = computeSegments(features, DEFAULT_SETTINGS);
  return scoreCandidate(features, segments, DEFAULT_SETTINGS);
}

describe('category selection', () => {
  it('prefers active buying intent over every other reason', () => {
    const result = score(
      customer({
        openLeadLastActivityAt: daysAgo(1),
        outstandingDebt: 30000,
        purchaseCount: 3,
        lastPurchaseAt: daysAgo(200),
        firstPurchaseAt: daysAgo(400),
      }),
    );
    expect(result?.category).toBe('HOT_LEAD');
  });

  it('prefers money owed over a predicted reorder', () => {
    const result = score(
      customer({
        outstandingDebt: 20000,
        purchaseCount: 3,
        lastPurchaseAt: daysAgo(40),
        productReorderIntervalDays: 30,
        firstPurchaseAt: daysAgo(100),
      }),
    );
    expect(result?.category).toBe('DEBTOR');
    expect(result?.segments).toEqual(expect.arrayContaining(['DEBTOR', 'REORDER_DUE']));
  });

  it('returns null when there is no actionable reason', () => {
    expect(score(customer())).toBeNull();
    // VIP alone is a modifier, not a reason to interrupt someone.
    expect(
      score(customer({ purchaseCount: 1, totalSpend: 500000, lastPurchaseAt: daysAgo(2) })),
    ).toBeNull();
  });

  it('picks nothing when no segments match', () => {
    expect(pickCategory([])).toBeNull();
  });
});

describe('score composition', () => {
  it('is bounded to 0–100', () => {
    const extreme = score(
      customer({
        openLeadLastActivityAt: NOW,
        outstandingDebt: 10_000_000,
        totalSpend: 10_000_000,
        purchaseCount: 500,
        lastPurchaseAt: daysAgo(400),
        firstPurchaseAt: daysAgo(800),
      }),
    );
    expect(extreme!.score).toBeLessThanOrEqual(100);
    expect(extreme!.score).toBeGreaterThanOrEqual(0);
  });

  it('attributes every point to a named component', () => {
    const result = score(
      customer({
        purchaseCount: 4,
        totalSpend: 80000,
        lastPurchaseAt: daysAgo(45),
        firstPurchaseAt: daysAgo(135),
        productReorderIntervalDays: 30,
      }),
    )!;
    const b = result.breakdown;
    const sum = b.categoryBase + b.urgency + b.customerValue + b.engagement - b.contactFatigue;
    expect(Math.round(sum)).toBe(result.score);
  });

  it('scores a more overdue reorder higher than a barely-due one', () => {
    const barely = score(
      customer({
        purchaseCount: 3,
        lastPurchaseAt: daysAgo(28),
        productReorderIntervalDays: 30,
        firstPurchaseAt: daysAgo(90),
      }),
    )!;
    const veryOverdue = score(
      customer({
        purchaseCount: 3,
        lastPurchaseAt: daysAgo(55),
        productReorderIntervalDays: 30,
        firstPurchaseAt: daysAgo(115),
      }),
    )!;
    expect(veryOverdue.score).toBeGreaterThan(barely.score);
  });

  it('scores a fresher lead higher than a stale one', () => {
    const fresh = score(customer({ openLeadLastActivityAt: daysAgo(1) }))!;
    const stale = score(customer({ openLeadLastActivityAt: daysAgo(12) }))!;
    expect(fresh.score).toBeGreaterThan(stale.score);
  });

  it('scores a bigger debt higher than a small one', () => {
    const big = score(
      customer({ outstandingDebt: 200000, purchaseCount: 1, lastPurchaseAt: daysAgo(30) }),
    )!;
    const small = score(
      customer({ outstandingDebt: 500, purchaseCount: 1, lastPurchaseAt: daysAgo(30) }),
    )!;
    expect(big.score).toBeGreaterThan(small.score);
  });

  it('rewards high-value, loyal customers', () => {
    const base = {
      purchaseCount: 2,
      lastPurchaseAt: daysAgo(45),
      productReorderIntervalDays: 30,
      firstPurchaseAt: daysAgo(75),
    };
    const ordinary = score(customer({ ...base, totalSpend: 5000 }))!;
    const valuable = score(customer({ ...base, totalSpend: 150000, purchaseCount: 8 }))!;
    expect(valuable.score).toBeGreaterThan(ordinary.score);
  });

  it('penalizes customers contacted more recently', () => {
    const base = {
      purchaseCount: 3,
      lastPurchaseAt: daysAgo(45),
      productReorderIntervalDays: 30,
      firstPurchaseAt: daysAgo(105),
    };
    const notContacted = score(customer(base))!;
    const contactedRecently = score(customer({ ...base, lastContactedAt: daysAgo(8) }))!;
    expect(contactedRecently.score).toBeLessThan(notContacted.score);
    expect(contactedRecently.breakdown.contactFatigue).toBeGreaterThan(0);
  });

  it('carries reason codes from the primary category first', () => {
    const result = score(
      customer({
        purchaseCount: 4,
        lastPurchaseAt: daysAgo(40),
        productReorderIntervalDays: 30,
        firstPurchaseAt: daysAgo(130),
        totalSpend: 150000,
      }),
    )!;
    expect(result.category).toBe('REORDER_DUE');
    expect(result.reasonCodes[0]).toBe('REORDER_DUE');
    expect(result.reasonCodes).toContain('HIGH_LIFETIME_SPEND');
  });

  it('is deterministic', () => {
    const input = customer({
      purchaseCount: 3,
      totalSpend: 90000,
      lastPurchaseAt: daysAgo(50),
      firstPurchaseAt: daysAgo(140),
      productReorderIntervalDays: 30,
    });
    expect(JSON.stringify(score(input))).toBe(JSON.stringify(score(input)));
  });
});

describe('ranking', () => {
  it('orders by score descending', () => {
    const ranked = rankCandidates([
      { customerId: 'a', score: 40, category: 'REORDER_DUE' as const },
      { customerId: 'b', score: 90, category: 'HOT_LEAD' as const },
      { customerId: 'c', score: 65, category: 'DEBTOR' as const },
    ]);
    expect(ranked.map((c) => c.customerId)).toEqual(['b', 'c', 'a']);
  });

  it('breaks ties by category priority then id, deterministically', () => {
    const ranked = rankCandidates([
      { customerId: 'z', score: 70, category: 'REORDER_DUE' as const },
      { customerId: 'a', score: 70, category: 'REORDER_DUE' as const },
      { customerId: 'm', score: 70, category: 'HOT_LEAD' as const },
    ]);
    expect(ranked.map((c) => c.customerId)).toEqual(['m', 'a', 'z']);
  });
});

describe('suppressed customers never become candidates', () => {
  it('an opted-out customer yields no eligible segments to score', () => {
    const result = computeIntelligence(
      customer({
        optedOut: true,
        outstandingDebt: 50000,
        purchaseCount: 2,
        lastPurchaseAt: daysAgo(60),
      }),
      DEFAULT_SETTINGS,
      NOW,
    );
    expect(result.eligibleSegments).toEqual([]);
    expect(scoreCandidate(result.features, result.eligibleSegments, DEFAULT_SETTINGS)).toBeNull();
  });
});
