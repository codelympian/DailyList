/**
 * Types for the deterministic customer intelligence engine.
 *
 * Everything here is plain data: the engine is a pure function of
 * (features, settings, today) — no I/O, no clock access, no randomness,
 * and no AI. That makes every classification reproducible and testable.
 */

export const SEGMENTS = [
  'HOT_LEAD',
  'REORDER_DUE',
  'DEBTOR',
  'LOST_CUSTOMER',
  'REPEAT_CUSTOMER',
  'VIP',
] as const;

export type Segment = (typeof SEGMENTS)[number];

export type LifecycleStage = 'LEAD' | 'CUSTOMER' | 'INACTIVE' | 'LOST';

/** Machine-readable justifications, rendered to human text by the UI/messages. */
export type ReasonCode =
  | 'RECENT_INTEREST'
  | 'NO_PURCHASE_YET'
  | 'REORDER_DUE'
  | 'RECENT_PURCHASE_HISTORY'
  | 'HIGH_PURCHASE_FREQUENCY'
  | 'PRODUCT_REORDER_INTERVAL'
  | 'OUTSTANDING_BALANCE'
  | 'INACTIVE_PERIOD'
  | 'REPEAT_PURCHASES'
  | 'HIGH_LIFETIME_SPEND'
  | 'NOT_RECENTLY_CONTACTED';

/** Why a customer must NOT be contacted. Suppression always beats scoring. */
export type SuppressionCode =
  'OPTED_OUT' | 'RECENTLY_CONTACTED' | 'PURCHASED_RECENTLY' | 'NO_CONTACT_METHOD' | 'NO_ACTIVITY';

export interface IntelligenceSettings {
  vipLifetimeSpend: number;
  repeatCustomerMinPurchases: number;
  defaultReorderIntervalDays: number;
  reorderDuePercent: number;
  lostReorderMultiple: number;
  lostCustomerDays: number;
  hotLeadRecencyDays: number;
  minContactIntervalDays: number;
  recentPurchaseSuppressionDays: number;
}

export const DEFAULT_SETTINGS: IntelligenceSettings = {
  vipLifetimeSpend: 100000,
  repeatCustomerMinPurchases: 2,
  defaultReorderIntervalDays: 45,
  reorderDuePercent: 90,
  lostReorderMultiple: 3,
  lostCustomerDays: 90,
  hotLeadRecencyDays: 14,
  minContactIntervalDays: 7,
  recentPurchaseSuppressionDays: 3,
};

/**
 * Everything the engine needs about one customer, already aggregated.
 * Amounts are plain numbers in the business currency (major units);
 * they come from Decimal columns and are only compared, never used for
 * financial arithmetic that the user sees.
 */
export interface CustomerFeatureInput {
  customerId: string;
  name: string;
  hasPhone: boolean;
  purchaseCount: number;
  totalSpend: number;
  outstandingDebt: number;
  lastPurchaseAt: Date | null;
  /** Second-most-recent purchase, used to infer purchase rhythm. */
  previousPurchaseAt: Date | null;
  /** Span between first and last purchase, for average interval. */
  firstPurchaseAt: Date | null;
  lastContactedAt: Date | null;
  /** Reorder interval of the most recently purchased product that defines one. */
  productReorderIntervalDays: number | null;
  /** Most recent product name, used for message personalization later. */
  lastProductName: string | null;
  /** Most recent activity on an OPEN lead (not WON/LOST). */
  openLeadLastActivityAt: Date | null;
  openLeadInterest: string | null;
  optedOut: boolean;
}

/** Derived, explainable facts computed from the raw input. */
export interface CustomerFeatures extends CustomerFeatureInput {
  daysSinceLastPurchase: number | null;
  daysSinceLastContact: number | null;
  daysSinceLeadActivity: number | null;
  /** Mean days between purchases when there is enough history. */
  averagePurchaseIntervalDays: number | null;
  /** The interval the engine will actually use, and where it came from. */
  expectedReorderIntervalDays: number | null;
  reorderIntervalSource: 'PRODUCT' | 'HISTORY' | 'DEFAULT' | null;
  daysUntilReorderDue: number | null;
}

export interface SegmentMatch {
  segment: Segment;
  reasonCodes: ReasonCode[];
  /** Values the UI/message templates interpolate — never invented. */
  facts: Record<string, string | number>;
}

export interface SuppressionResult {
  suppressed: boolean;
  codes: SuppressionCode[];
}

export interface CustomerIntelligence {
  customerId: string;
  features: CustomerFeatures;
  lifecycleStage: LifecycleStage;
  segments: SegmentMatch[];
  suppression: SuppressionResult;
  /** Segments the business may act on today (empty when suppressed). */
  eligibleSegments: SegmentMatch[];
}
