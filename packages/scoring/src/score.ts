import type {
  CustomerFeatures,
  IntelligenceSettings,
  ReasonCode,
  Segment,
  SegmentMatch,
} from './types';

/**
 * Priority scoring: "who is most worth contacting today?"
 *
 * Deterministic and fully explainable — every point is attributable to a
 * named component, and the same inputs always produce the same score.
 * No machine learning, no LLM: an LLM must never decide who to contact.
 *
 *   score = categoryBase + urgency + customerValue + engagement − contactFatigue
 *
 * Components are bounded so the total normalizes cleanly to 0–100.
 */

/** Categories a daily card can carry, in tie-breaking priority order. */
export const RECOMMENDATION_CATEGORIES = [
  'HOT_LEAD',
  'DEBTOR',
  'REORDER_DUE',
  'LOST_CUSTOMER',
] as const;

export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number];

/**
 * Base weight per category — the intrinsic "reason strength" of contacting
 * someone for this reason. Active buying intent outranks money already owed,
 * which outranks a predicted need, which outranks a win-back attempt.
 */
const CATEGORY_BASE: Record<RecommendationCategory, number> = {
  HOT_LEAD: 50,
  DEBTOR: 45,
  REORDER_DUE: 42,
  LOST_CUSTOMER: 28,
};

const MAX_URGENCY = 25;
const MAX_VALUE = 15;
const MAX_ENGAGEMENT = 10;
const MAX_FATIGUE_PENALTY = 25;

export interface ScoreBreakdown {
  categoryBase: number;
  urgency: number;
  customerValue: number;
  engagement: number;
  contactFatigue: number;
  raw: number;
  score: number;
}

export interface ScoredCandidate {
  category: RecommendationCategory;
  score: number;
  breakdown: ScoreBreakdown;
  segments: Segment[];
  reasonCodes: ReasonCode[];
}

/** The card category: the highest-priority actionable segment matched. */
export function pickCategory(segments: SegmentMatch[]): RecommendationCategory | null {
  for (const category of RECOMMENDATION_CATEGORIES) {
    if (segments.some((s) => s.segment === category)) return category;
  }
  return null;
}

/** How pressing this particular reason is right now (0–25). */
function urgencyFor(
  category: RecommendationCategory,
  f: CustomerFeatures,
  s: IntelligenceSettings,
): number {
  switch (category) {
    case 'HOT_LEAD': {
      // Freshest interest scores highest; decays across the hot-lead window.
      const days = f.daysSinceLeadActivity ?? s.hotLeadRecencyDays;
      const freshness = 1 - clamp01(days / Math.max(1, s.hotLeadRecencyDays));
      return round(MAX_URGENCY * freshness);
    }
    case 'DEBTOR': {
      // Larger debts first, on a log scale so one huge invoice cannot
      // permanently crowd out everyone else.
      const magnitude = clamp01(Math.log10(Math.max(1, f.outstandingDebt)) / 6);
      return round(MAX_URGENCY * magnitude);
    }
    case 'REORDER_DUE': {
      const interval = f.expectedReorderIntervalDays ?? s.defaultReorderIntervalDays;
      const since = f.daysSinceLastPurchase ?? 0;
      // 0 at the "due" threshold, full marks by one interval past due.
      const dueAt = (interval * s.reorderDuePercent) / 100;
      const overdue = clamp01((since - dueAt) / Math.max(1, interval));
      return round(MAX_URGENCY * overdue);
    }
    case 'LOST_CUSTOMER': {
      // Recently-lost customers are the most winnable; very old ones fade.
      const since = f.daysSinceLastPurchase ?? 0;
      const threshold = Math.max(1, s.lostCustomerDays);
      const staleness = clamp01((since - threshold) / (threshold * 3));
      return round(MAX_URGENCY * (1 - staleness));
    }
    default:
      return 0;
  }
}

/** Lifetime value relative to the business's own VIP bar (0–15). */
function customerValue(f: CustomerFeatures, s: IntelligenceSettings): number {
  if (s.vipLifetimeSpend <= 0) return 0;
  return round(MAX_VALUE * clamp01(f.totalSpend / s.vipLifetimeSpend));
}

/** Purchase frequency as a proxy for responsiveness (0–10). */
function engagement(f: CustomerFeatures, s: IntelligenceSettings): number {
  const target = Math.max(1, s.repeatCustomerMinPurchases * 3);
  return round(MAX_ENGAGEMENT * clamp01(f.purchaseCount / target));
}

/**
 * Contact fatigue penalty (0–25). Suppression already blocks anyone inside
 * the minimum interval; this softens customers contacted a little while ago
 * so fresh candidates outrank them.
 */
function contactFatigue(f: CustomerFeatures, s: IntelligenceSettings): number {
  if (f.daysSinceLastContact === null) return 0;
  const window = Math.max(1, s.minContactIntervalDays * 3);
  const recency = 1 - clamp01(f.daysSinceLastContact / window);
  return round(MAX_FATIGUE_PENALTY * recency);
}

/**
 * Scores a candidate. Returns null when no actionable category applies —
 * customers are never recommended arbitrarily.
 */
export function scoreCandidate(
  features: CustomerFeatures,
  segments: SegmentMatch[],
  settings: IntelligenceSettings,
): ScoredCandidate | null {
  const category = pickCategory(segments);
  if (!category) return null;

  const categoryBase = CATEGORY_BASE[category];
  const urgency = urgencyFor(category, features, settings);
  const value = customerValue(features, settings);
  const engage = engagement(features, settings);
  const fatigue = contactFatigue(features, settings);

  const raw = categoryBase + urgency + value + engage - fatigue;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    category,
    score,
    breakdown: {
      categoryBase,
      urgency,
      customerValue: value,
      engagement: engage,
      contactFatigue: fatigue,
      raw: round(raw),
      score,
    },
    segments: segments.map((s) => s.segment),
    // Reason codes from every matched segment, primary category first.
    reasonCodes: dedupe([
      ...(segments.find((s) => s.segment === category)?.reasonCodes ?? []),
      ...segments.flatMap((s) => s.reasonCodes),
    ]),
  };
}

/**
 * Ranks candidates highest-score-first. Ties break by category priority and
 * then customer id, so ordering is stable across runs.
 */
export function rankCandidates<T extends { score: number; category: RecommendationCategory }>(
  candidates: (T & { customerId: string })[],
): (T & { customerId: string })[] {
  return [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const priority =
      RECOMMENDATION_CATEGORIES.indexOf(a.category) - RECOMMENDATION_CATEGORIES.indexOf(b.category);
    if (priority !== 0) return priority;
    return a.customerId.localeCompare(b.customerId);
  });
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function dedupe<T>(values: T[]): T[] {
  return [...new Set(values)];
}
