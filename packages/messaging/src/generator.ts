import { validateMessage } from './guardrails';
import { renderDefaultMessage, renderTemplate } from './templates';
import type {
  GeneratedMessage,
  MessageCategory,
  MessageFacts,
  MessageGenerationOptions,
} from './types';

const AI_SYSTEM_PROMPT = [
  'You write short WhatsApp follow-up messages for a Nigerian small business owner',
  'to send to their customer. Write as the business owner, warmly and simply.',
  '',
  'STRICT RULES:',
  '- Use ONLY the facts given to you. Never add any other fact.',
  '- Never mention prices, discounts, promotions, free items, stock or availability,',
  '  delivery times, refunds or guarantees. You do not know these.',
  '- Never invent numbers. The only numbers you may use are the ones provided.',
  '- Never include links.',
  '- Address the customer by their first name.',
  '- One or two short sentences, under 300 characters. End with a friendly question.',
  '- Reply with the message text only — no quotes, no preamble, no explanation.',
].join('\n');

/**
 * Produces the suggested message for a recommendation.
 *
 * The deterministic template is computed first and always available; AI is
 * only ever an optional rewrite that must pass the same guardrails. Any
 * failure — disabled, missing provider, network error, timeout, or a
 * guardrail violation — silently falls back to the template. The product
 * works identically with AI switched off.
 */
export async function generateMessage(
  category: MessageCategory,
  facts: MessageFacts,
  options: MessageGenerationOptions = {},
): Promise<GeneratedMessage> {
  const template = options.templateOverride
    ? renderTemplate(options.templateOverride, category, facts)
    : renderDefaultMessage(category, facts);

  const fallback = (fallbackReason?: string): GeneratedMessage => ({
    text: template,
    source: 'TEMPLATE',
    category,
    ...(fallbackReason ? { fallbackReason } : {}),
  });

  if (!options.aiEnabled || !options.provider) {
    return fallback();
  }

  let candidate: string;
  try {
    candidate = await options.provider.complete({
      system: AI_SYSTEM_PROMPT,
      prompt: buildPrompt(category, facts, template),
      maxTokens: 300,
    });
  } catch (error) {
    return fallback(`ai_error: ${error instanceof Error ? error.name : 'unknown'}`);
  }

  const cleaned = cleanup(candidate);
  const check = validateMessage(cleaned, facts);
  if (!check.ok) {
    return fallback(`guardrail: ${check.violations.join('; ')}`);
  }

  return { text: cleaned, source: 'AI', category };
}

/** The prompt carries the fact list explicitly — nothing else is available. */
export function buildPrompt(
  category: MessageCategory,
  facts: MessageFacts,
  template: string,
): string {
  const lines = [
    `Reason for contacting: ${describeCategory(category)}`,
    `Business name: ${facts.businessName}`,
    `Customer name: ${facts.customerName}`,
  ];
  if (facts.productName) lines.push(`Product they are interested in: ${facts.productName}`);
  if (facts.outstandingAmount) lines.push(`Outstanding balance: ${facts.outstandingAmount}`);
  if (facts.daysSinceInterest !== undefined) {
    lines.push(`Days since they asked: ${facts.daysSinceInterest}`);
  }
  if (facts.daysSinceLastPurchase !== undefined) {
    lines.push(`Days since their last purchase: ${facts.daysSinceLastPurchase}`);
  }
  if (facts.reorderIntervalDays !== undefined) {
    lines.push(`They usually reorder every ${facts.reorderIntervalDays} days`);
  }

  return [
    'Facts (the only information you may use):',
    ...lines.map((line) => `- ${line}`),
    '',
    'A working example of the tone and length:',
    template,
    '',
    'Write the message.',
  ].join('\n');
}

function describeCategory(category: MessageCategory): string {
  switch (category) {
    case 'HOT_LEAD':
      return 'they asked about a product but have not bought it yet';
    case 'REORDER':
      return 'they are likely due to buy again';
    case 'DEBTOR':
      return 'they have an unpaid balance';
    case 'REACTIVATION':
      return 'they have not bought in a long time';
    default:
      return 'follow-up';
  }
}

/** Strips wrapper quotes and preamble an LLM sometimes adds. */
function cleanup(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^(here(?:'s| is)[^:]*:|message:)\s*/i, '').trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith('“') && text.endsWith('”'))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text.replace(/\s{2,}/g, ' ');
}
