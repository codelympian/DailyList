import type { MessageCategory, MessageFacts } from './types';

/**
 * Deterministic templates — the product's floor. These always work, need
 * no network, and make no claim beyond the supplied facts.
 *
 * Note what they deliberately avoid: stock levels, prices, discounts and
 * delivery promises. "Would you like me to reserve one?" is an offer the
 * owner can choose to honour, not a claim about inventory we do not track.
 */

export const DEFAULT_TEMPLATES: Record<MessageCategory, string> = {
  HOT_LEAD:
    'Hi {{first_name}} 😊 You asked about {{product}} {{when}}. Would you like me to reserve one for you?',
  REORDER:
    'Hi {{first_name}} 😊 You may be due for another {{product}}. Would you like me to set one aside for you?',
  DEBTOR:
    'Hi {{first_name}} 😊 A gentle reminder that you have a balance of {{amount}} with {{business_name}}. Would you like to settle it this week?',
  REACTIVATION:
    "Hi {{first_name}} 😊 It's been a while since your last order. Is there anything you need from {{business_name}}? We'd love to have you back.",
};

/** Used when no specific product/interest is known. */
const NO_PRODUCT_TEMPLATES: Record<MessageCategory, string> = {
  HOT_LEAD:
    'Hi {{first_name}} 😊 You got in touch {{when}} about ordering. Would you like me to help you finish it?',
  REORDER:
    'Hi {{first_name}} 😊 It may be time for your next order. Would you like me to prepare it for you?',
  DEBTOR: DEFAULT_TEMPLATES.DEBTOR,
  REACTIVATION: DEFAULT_TEMPLATES.REACTIVATION,
};

export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  const first = trimmed.split(/\s+/)[0];
  return first && first.length > 0 ? first : trimmed;
}

/** "today" | "yesterday" | "N days ago" — never a fabricated timeframe. */
export function describeWhen(days: number | undefined): string {
  if (days === undefined) return 'recently';
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/**
 * Renders a template with the allowed facts. Any placeholder without a
 * corresponding fact is removed rather than left as `{{...}}`, and the
 * result is whitespace-normalized.
 */
export function renderTemplate(
  template: string,
  category: MessageCategory,
  facts: MessageFacts,
): string {
  const values: Record<string, string | undefined> = {
    first_name: firstName(facts.customerName),
    customer_name: facts.customerName.trim(),
    business_name: facts.businessName.trim(),
    product: facts.productName?.trim(),
    amount: facts.outstandingAmount?.trim(),
    when: describeWhen(
      category === 'HOT_LEAD' ? facts.daysSinceInterest : facts.daysSinceLastPurchase,
    ),
    days_since_purchase:
      facts.daysSinceLastPurchase !== undefined ? String(facts.daysSinceLastPurchase) : undefined,
    interval_days:
      facts.reorderIntervalDays !== undefined ? String(facts.reorderIntervalDays) : undefined,
  };

  const rendered = template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, key: string) => {
    return values[key.toLowerCase()] ?? '';
  });

  return rendered
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}

/** Picks the right built-in template for the facts available. */
export function selectTemplate(category: MessageCategory, facts: MessageFacts): string {
  const needsProduct = category === 'HOT_LEAD' || category === 'REORDER';
  if (needsProduct && !facts.productName) return NO_PRODUCT_TEMPLATES[category];
  return DEFAULT_TEMPLATES[category];
}

/** Deterministic message: the guaranteed path that never fails. */
export function renderDefaultMessage(category: MessageCategory, facts: MessageFacts): string {
  return renderTemplate(selectTemplate(category, facts), category, facts);
}
