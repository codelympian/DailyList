import { firstName } from './templates';
import type { GuardrailResult, MessageFacts } from './types';

export const MAX_MESSAGE_LENGTH = 480;

/**
 * Claims a suggested message must never make, because Dailylist has no
 * data to support them. Prices, stock, discounts, delivery and refunds are
 * business facts the owner alone can state.
 */
const BANNED_CLAIM_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bdiscount(s|ed)?\b/i, label: 'discount claim' },
  { pattern: /\b\d+\s*%\s*(off|discount)\b/i, label: 'percentage-off claim' },
  { pattern: /\bfree\b/i, label: 'free-offer claim' },
  { pattern: /\bpromo(tion|tional)?\b|\bcoupon\b|\bvoucher\b/i, label: 'promotion claim' },
  { pattern: /\b(in|out of|back in)\s+stock\b/i, label: 'stock claim' },
  {
    pattern: /\bavailable now\b|\bplenty left\b|\blast one\b|\bfew left\b/i,
    label: 'availability claim',
  },
  { pattern: /\b(refund|guarantee|warranty)\b/i, label: 'refund or guarantee claim' },
  { pattern: /\bdeliver(y|ed)?\s+(today|tomorrow|free)\b/i, label: 'delivery promise' },
  { pattern: /\blimited time\b|\bexpires?\b|\bhurry\b|\bact fast\b/i, label: 'urgency pressure' },
  { pattern: /\bcheapest\b|\blowest price\b|\bbest price\b/i, label: 'price claim' },
  { pattern: /\bhttps?:\/\/|\bwww\./i, label: 'link' },
];

/**
 * Validates a candidate message against the ONLY facts it is allowed to use.
 *
 * The core check is numeric: after removing known names, every number left
 * in the message must be a number we supplied. That is what stops an LLM
 * quietly inventing a price, a quantity, or an order reference.
 */
export function validateMessage(text: string, facts: MessageFacts): GuardrailResult {
  const violations: string[] = [];
  const message = text.trim();

  if (message.length === 0) {
    return { ok: false, violations: ['empty message'] };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    violations.push(`too long (${message.length} > ${MAX_MESSAGE_LENGTH} characters)`);
  }
  if (/\{\{|\}\}/.test(message)) {
    violations.push('unresolved template placeholder');
  }

  const customerFirst = firstName(facts.customerName);
  if (!containsInsensitive(message, customerFirst)) {
    violations.push('does not address the customer by name');
  }

  for (const { pattern, label } of BANNED_CLAIM_PATTERNS) {
    if (pattern.test(message)) violations.push(`invented ${label}`);
  }

  for (const number of unknownNumbersIn(message, facts)) {
    violations.push(`invented number "${number}"`);
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Numbers present in the message that were not supplied as facts.
 * Known names are stripped first so a product like "Serum 50ml" or a
 * business like "Shop 24" never trips the check.
 */
export function unknownNumbersIn(message: string, facts: MessageFacts): string[] {
  let stripped = message;
  for (const name of [facts.productName, facts.businessName, facts.customerName]) {
    if (name) stripped = removeAllInsensitive(stripped, name);
  }

  const allowed = allowedNumbers(facts);
  const found = stripped.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];

  return found.map(normalizeNumber).filter((value) => !allowed.has(value));
}

function allowedNumbers(facts: MessageFacts): Set<string> {
  const allowed = new Set<string>();
  const add = (value: string | number | undefined): void => {
    if (value === undefined) return;
    const text = String(value);
    for (const match of text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) {
      allowed.add(normalizeNumber(match));
    }
  };

  add(facts.outstandingAmount);
  add(facts.daysSinceInterest);
  add(facts.daysSinceLastPurchase);
  add(facts.reorderIntervalDays);
  return allowed;
}

/** "20,000.00" and "20000" compare equal; trailing zeros are insignificant. */
function normalizeNumber(raw: string): string {
  const cleaned = raw.replace(/,/g, '');
  const asNumber = Number(cleaned);
  return Number.isFinite(asNumber) ? String(asNumber) : cleaned;
}

function containsInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function removeAllInsensitive(haystack: string, needle: string): string {
  if (!needle.trim()) return haystack;
  return haystack.replace(new RegExp(escapeRegExp(needle), 'gi'), ' ');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
