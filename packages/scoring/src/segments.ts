import { extractFeatures } from './features';
import type {
  CustomerFeatureInput,
  CustomerFeatures,
  CustomerIntelligence,
  IntelligenceSettings,
  LifecycleStage,
  SegmentMatch,
  SuppressionResult,
} from './types';

/**
 * Rules are intentionally independent: a customer can be a VIP, a debtor
 * and reorder-due at the same time. Nothing here is mutually exclusive.
 */

function hotLead(f: CustomerFeatures, s: IntelligenceSettings): SegmentMatch | null {
  if (f.daysSinceLeadActivity === null) return null;
  if (f.daysSinceLeadActivity > s.hotLeadRecencyDays) return null;

  // "Purchase has not occurred" — no purchase since the interest was shown.
  const purchasedSinceInterest =
    f.daysSinceLastPurchase !== null && f.daysSinceLastPurchase <= f.daysSinceLeadActivity;
  if (purchasedSinceInterest) return null;

  return {
    segment: 'HOT_LEAD',
    reasonCodes: ['RECENT_INTEREST', 'NO_PURCHASE_YET'],
    facts: {
      daysSinceInterest: f.daysSinceLeadActivity,
      ...(f.openLeadInterest ? { interest: f.openLeadInterest } : {}),
    },
  };
}

function reorderDue(f: CustomerFeatures, s: IntelligenceSettings): SegmentMatch | null {
  if (f.purchaseCount < 1) return null;
  if (f.expectedReorderIntervalDays === null || f.daysSinceLastPurchase === null) return null;

  // Near or past due: at/after the configured percentage of the interval.
  const threshold = (f.expectedReorderIntervalDays * s.reorderDuePercent) / 100;
  if (f.daysSinceLastPurchase < threshold) return null;

  // Already inactive long enough to be "lost" — that rule speaks instead.
  if (isLost(f, s)) return null;

  const reasonCodes: SegmentMatch['reasonCodes'] = ['REORDER_DUE'];
  if (f.reorderIntervalSource === 'PRODUCT') reasonCodes.push('PRODUCT_REORDER_INTERVAL');
  if (f.reorderIntervalSource === 'HISTORY') reasonCodes.push('RECENT_PURCHASE_HISTORY');
  if (f.purchaseCount >= s.repeatCustomerMinPurchases) reasonCodes.push('HIGH_PURCHASE_FREQUENCY');

  return {
    segment: 'REORDER_DUE',
    reasonCodes,
    facts: {
      intervalDays: f.expectedReorderIntervalDays,
      daysSinceLastPurchase: f.daysSinceLastPurchase,
      intervalSource: f.reorderIntervalSource ?? 'DEFAULT',
      ...(f.lastProductName ? { product: f.lastProductName } : {}),
    },
  };
}

function debtor(f: CustomerFeatures): SegmentMatch | null {
  if (f.outstandingDebt <= 0) return null;
  return {
    segment: 'DEBTOR',
    reasonCodes: ['OUTSTANDING_BALANCE'],
    facts: { outstandingDebt: f.outstandingDebt },
  };
}

/** Inactivity threshold: product/history-derived when known, else the business default. */
export function lostThresholdDays(f: CustomerFeatures, s: IntelligenceSettings): number {
  if (f.expectedReorderIntervalDays !== null && f.reorderIntervalSource !== 'DEFAULT') {
    return f.expectedReorderIntervalDays * s.lostReorderMultiple;
  }
  return s.lostCustomerDays;
}

function isLost(f: CustomerFeatures, s: IntelligenceSettings): boolean {
  if (f.purchaseCount < 1 || f.daysSinceLastPurchase === null) return false;
  return f.daysSinceLastPurchase >= lostThresholdDays(f, s);
}

function lostCustomer(f: CustomerFeatures, s: IntelligenceSettings): SegmentMatch | null {
  if (!isLost(f, s)) return null;
  return {
    segment: 'LOST_CUSTOMER',
    reasonCodes: ['INACTIVE_PERIOD'],
    facts: {
      daysSinceLastPurchase: f.daysSinceLastPurchase ?? 0,
      thresholdDays: lostThresholdDays(f, s),
      ...(f.lastProductName ? { product: f.lastProductName } : {}),
    },
  };
}

function repeatCustomer(f: CustomerFeatures, s: IntelligenceSettings): SegmentMatch | null {
  if (f.purchaseCount < s.repeatCustomerMinPurchases) return null;
  return {
    segment: 'REPEAT_CUSTOMER',
    reasonCodes: ['REPEAT_PURCHASES'],
    facts: {
      purchaseCount: f.purchaseCount,
      ...(f.averagePurchaseIntervalDays
        ? { averageIntervalDays: f.averagePurchaseIntervalDays }
        : {}),
    },
  };
}

function vip(f: CustomerFeatures, s: IntelligenceSettings): SegmentMatch | null {
  if (f.totalSpend < s.vipLifetimeSpend) return null;
  return {
    segment: 'VIP',
    reasonCodes: ['HIGH_LIFETIME_SPEND'],
    facts: { totalSpend: f.totalSpend, threshold: s.vipLifetimeSpend },
  };
}

export function computeSegments(
  features: CustomerFeatures,
  settings: IntelligenceSettings,
): SegmentMatch[] {
  return [
    hotLead(features, settings),
    reorderDue(features, settings),
    debtor(features),
    lostCustomer(features, settings),
    repeatCustomer(features, settings),
    vip(features, settings),
  ].filter((match): match is SegmentMatch => match !== null);
}

export function computeLifecycleStage(
  features: CustomerFeatures,
  settings: IntelligenceSettings,
): LifecycleStage {
  if (features.purchaseCount < 1) return 'LEAD';
  if (isLost(features, settings)) return 'LOST';
  // Past the reorder point but not yet lost.
  if (
    features.daysSinceLastPurchase !== null &&
    features.expectedReorderIntervalDays !== null &&
    features.daysSinceLastPurchase > features.expectedReorderIntervalDays
  ) {
    return 'INACTIVE';
  }
  return 'CUSTOMER';
}

/**
 * Suppression takes priority over every segment and every score.
 * A suppressed customer must never be recommended for follow-up.
 */
export function computeSuppression(
  features: CustomerFeatures,
  settings: IntelligenceSettings,
  segments: SegmentMatch[],
): SuppressionResult {
  const codes: SuppressionResult['codes'] = [];

  if (features.optedOut) codes.push('OPTED_OUT');
  if (!features.hasPhone) codes.push('NO_CONTACT_METHOD');
  if (
    features.daysSinceLastContact !== null &&
    features.daysSinceLastContact < settings.minContactIntervalDays
  ) {
    codes.push('RECENTLY_CONTACTED');
  }
  if (
    features.daysSinceLastPurchase !== null &&
    features.daysSinceLastPurchase < settings.recentPurchaseSuppressionDays &&
    // A debt is still worth chasing even right after a purchase.
    !segments.some((s) => s.segment === 'DEBTOR')
  ) {
    codes.push('PURCHASED_RECENTLY');
  }
  if (segments.length === 0) codes.push('NO_ACTIVITY');

  return { suppressed: codes.length > 0, codes };
}

/** Full deterministic intelligence for one customer at a point in time. */
export function computeIntelligence(
  input: CustomerFeatureInput,
  settings: IntelligenceSettings,
  now: Date = new Date(),
): CustomerIntelligence {
  const features = extractFeatures(input, settings, now);
  const segments = computeSegments(features, settings);
  const suppression = computeSuppression(features, settings, segments);
  return {
    customerId: input.customerId,
    features,
    lifecycleStage: computeLifecycleStage(features, settings),
    segments,
    suppression,
    eligibleSegments: suppression.suppressed ? [] : segments,
  };
}
