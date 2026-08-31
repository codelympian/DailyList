import type { CustomerFeatureInput, CustomerFeatures, IntelligenceSettings } from './types';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days between two instants (floored, never negative for past dates). */
export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function daysSince(date: Date | null, now: Date): number | null {
  if (!date) return null;
  return daysBetween(date, now);
}

/**
 * Derives explainable facts from raw customer aggregates.
 *
 * The reorder interval is resolved in priority order, and the source is
 * recorded so the UI can explain WHY a reorder is due:
 *   1. PRODUCT — the reorder interval set on what they actually bought
 *   2. HISTORY — their own average purchase rhythm (needs 2+ purchases)
 *   3. DEFAULT — the business-wide fallback
 */
export function extractFeatures(
  input: CustomerFeatureInput,
  settings: IntelligenceSettings,
  now: Date,
): CustomerFeatures {
  const daysSinceLastPurchase = daysSince(input.lastPurchaseAt, now);

  let averagePurchaseIntervalDays: number | null = null;
  if (input.purchaseCount >= 2 && input.firstPurchaseAt && input.lastPurchaseAt) {
    const span = daysBetween(input.firstPurchaseAt, input.lastPurchaseAt);
    const intervals = input.purchaseCount - 1;
    if (span > 0 && intervals > 0) {
      averagePurchaseIntervalDays = Math.round(span / intervals);
    }
  }

  let expectedReorderIntervalDays: number | null = null;
  let reorderIntervalSource: CustomerFeatures['reorderIntervalSource'] = null;
  if (input.purchaseCount >= 1) {
    if (input.productReorderIntervalDays && input.productReorderIntervalDays > 0) {
      expectedReorderIntervalDays = input.productReorderIntervalDays;
      reorderIntervalSource = 'PRODUCT';
    } else if (averagePurchaseIntervalDays && averagePurchaseIntervalDays > 0) {
      expectedReorderIntervalDays = averagePurchaseIntervalDays;
      reorderIntervalSource = 'HISTORY';
    } else {
      expectedReorderIntervalDays = settings.defaultReorderIntervalDays;
      reorderIntervalSource = 'DEFAULT';
    }
  }

  const daysUntilReorderDue =
    expectedReorderIntervalDays !== null && daysSinceLastPurchase !== null
      ? expectedReorderIntervalDays - daysSinceLastPurchase
      : null;

  return {
    ...input,
    daysSinceLastPurchase,
    daysSinceLastContact: daysSince(input.lastContactedAt, now),
    daysSinceLeadActivity: daysSince(input.openLeadLastActivityAt, now),
    averagePurchaseIntervalDays,
    expectedReorderIntervalDays,
    reorderIntervalSource,
    daysUntilReorderDue,
  };
}
