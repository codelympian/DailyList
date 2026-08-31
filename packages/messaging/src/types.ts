/**
 * Message generation types.
 *
 * The central safety idea: a suggested message may only ever reference
 * facts in `MessageFacts`. Those facts come from the database. Anything
 * outside that set — a price, a discount, a stock claim, an order number —
 * is an invented business fact and must be rejected.
 */

export const MESSAGE_CATEGORIES = ['HOT_LEAD', 'REORDER', 'DEBTOR', 'REACTIVATION'] as const;

export type MessageCategory = (typeof MESSAGE_CATEGORIES)[number];

/** Maps a recommendation category to its message category. */
export const RECOMMENDATION_TO_MESSAGE_CATEGORY: Record<string, MessageCategory> = {
  HOT_LEAD: 'HOT_LEAD',
  REORDER_DUE: 'REORDER',
  DEBTOR: 'DEBTOR',
  LOST_CUSTOMER: 'REACTIVATION',
};

/**
 * Every value a message is permitted to mention. All fields are measured
 * from real records — none are guesses.
 */
export interface MessageFacts {
  businessName: string;
  customerName: string;
  /** Product or interest the customer actually showed / bought. */
  productName?: string;
  /** Formatted outstanding balance, e.g. "₦20,000". */
  outstandingAmount?: string;
  daysSinceInterest?: number;
  daysSinceLastPurchase?: number;
  reorderIntervalDays?: number;
}

export interface GeneratedMessage {
  text: string;
  /** Where the wording came from — surfaced so the owner is never misled. */
  source: 'TEMPLATE' | 'AI';
  category: MessageCategory;
  /** Why AI output was rejected, when it was. */
  fallbackReason?: string;
}

export interface GuardrailResult {
  ok: boolean;
  violations: string[];
}

/**
 * Port for an LLM. Implemented in the API app so this package stays pure
 * and unit-testable; any provider can be swapped in behind it.
 */
export interface LlmProvider {
  readonly name: string;
  /** Returns the model's text, or throws. Implementations must apply their own timeout. */
  complete(input: { system: string; prompt: string; maxTokens: number }): Promise<string>;
}

export interface MessageGenerationOptions {
  /** When false (the default), templates are used and no LLM is called. */
  aiEnabled?: boolean;
  provider?: LlmProvider;
  /** Per-business template override body, if one exists. */
  templateOverride?: string;
}
