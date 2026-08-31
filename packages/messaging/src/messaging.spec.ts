import { generateMessage } from './generator';
import { MAX_MESSAGE_LENGTH, unknownNumbersIn, validateMessage } from './guardrails';
import { describeWhen, firstName, renderDefaultMessage, renderTemplate } from './templates';
import { MESSAGE_CATEGORIES, type LlmProvider, type MessageFacts } from './types';

const facts: MessageFacts = {
  businessName: "Ada's Glow",
  customerName: 'Ada Okafor',
  productName: 'Glow Serum',
  outstandingAmount: '₦20,000',
  daysSinceInterest: 4,
  daysSinceLastPurchase: 32,
  reorderIntervalDays: 30,
};

/** Test double: returns whatever the test wants the "LLM" to say. */
function providerReturning(text: string): LlmProvider {
  return { name: 'test', complete: async () => text };
}

function providerThatFails(error: Error): LlmProvider {
  return {
    name: 'test',
    complete: async () => {
      throw error;
    },
  };
}

describe('templates', () => {
  it('extracts a first name', () => {
    expect(firstName('Ada Okafor')).toBe('Ada');
    expect(firstName('  Ngozi  ')).toBe('Ngozi');
  });

  it('describes timeframes without inventing any', () => {
    expect(describeWhen(0)).toBe('today');
    expect(describeWhen(1)).toBe('yesterday');
    expect(describeWhen(4)).toBe('4 days ago');
    expect(describeWhen(undefined)).toBe('recently');
  });

  it('renders the hot lead template with name, product and timing', () => {
    const message = renderDefaultMessage('HOT_LEAD', facts);
    expect(message).toBe(
      'Hi Ada 😊 You asked about Glow Serum 4 days ago. Would you like me to reserve one for you?',
    );
  });

  it('renders the reorder template', () => {
    expect(renderDefaultMessage('REORDER', facts)).toContain('another Glow Serum');
  });

  it('renders the debtor template with the real balance', () => {
    const message = renderDefaultMessage('DEBTOR', facts);
    expect(message).toContain('₦20,000');
    expect(message).toContain("Ada's Glow");
  });

  it('renders the reactivation template', () => {
    expect(renderDefaultMessage('REACTIVATION', facts)).toContain('been a while');
  });

  it('falls back to product-free wording when no product is known', () => {
    const message = renderDefaultMessage('REORDER', {
      businessName: 'Shop',
      customerName: 'Bola Ade',
    });
    expect(message).not.toContain('undefined');
    expect(message).not.toMatch(/\{\{/);
    expect(message).toContain('Bola');
  });

  it('never leaves unresolved placeholders', () => {
    for (const category of MESSAGE_CATEGORIES) {
      const message = renderDefaultMessage(category, {
        businessName: 'Shop',
        customerName: 'Test Person',
      });
      expect(message).not.toMatch(/\{\{|\}\}/);
    }
  });

  it('supports a business template override', () => {
    const message = renderTemplate(
      'Hello {{first_name}}, your {{product}} is due after {{interval_days}} days.',
      'REORDER',
      facts,
    );
    expect(message).toBe('Hello Ada, your Glow Serum is due after 30 days.');
  });

  it('produces messages within the length limit for every category', () => {
    for (const category of MESSAGE_CATEGORIES) {
      expect(renderDefaultMessage(category, facts).length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    }
  });
});

describe('guardrails', () => {
  it('accepts every deterministic template', () => {
    for (const category of MESSAGE_CATEGORIES) {
      const result = validateMessage(renderDefaultMessage(category, facts), facts);
      expect(result.violations).toEqual([]);
      expect(result.ok).toBe(true);
    }
  });

  it.each([
    ['Hi Ada, get 20% off the Glow Serum today!', 'percentage-off'],
    ['Hi Ada, the Glow Serum is back in stock.', 'stock'],
    ['Hi Ada, we are giving a free bottle with your order.', 'free'],
    ['Hi Ada, your Glow Serum costs ₦15,000.', 'invented number'],
    ['Hi Ada, use promo code GLOW10.', 'promotion'],
    ['Hi Ada, we deliver free to your area.', 'delivery/free'],
    ['Hi Ada, order at https://shop.example.com', 'link'],
    ['Hi Ada, hurry — this offer expires tonight!', 'urgency'],
    ['Hi Ada, we guarantee a full refund.', 'refund/guarantee'],
  ])('rejects %s (%s)', (message) => {
    expect(validateMessage(message, facts).ok).toBe(false);
  });

  it('rejects a message that does not use the customer name', () => {
    const result = validateMessage('Hello there, your order is due.', facts);
    expect(result.violations).toContain('does not address the customer by name');
  });

  it('rejects unresolved placeholders', () => {
    const result = validateMessage('Hi Ada, your {{product}} is ready.', facts);
    expect(result.violations).toContain('unresolved template placeholder');
  });

  it('rejects an over-long message', () => {
    const result = validateMessage(`Hi Ada ${'x'.repeat(MAX_MESSAGE_LENGTH)}`, facts);
    expect(result.violations.some((v) => v.startsWith('too long'))).toBe(true);
  });

  it('allows numbers that were supplied as facts', () => {
    const message = 'Hi Ada, it has been 32 days and you usually reorder every 30 days.';
    expect(validateMessage(message, facts).ok).toBe(true);
  });

  it('treats ₦20,000 and 20000 as the same supplied fact', () => {
    expect(unknownNumbersIn('Hi Ada, you owe 20000.', facts)).toEqual([]);
  });

  it('does not flag numbers inside the product or business name', () => {
    const numbered: MessageFacts = {
      businessName: 'Shop 24',
      customerName: 'Bola Ade',
      productName: 'Serum 50ml',
    };
    expect(unknownNumbersIn('Hi Bola, your Serum 50ml from Shop 24 is ready.', numbered)).toEqual(
      [],
    );
  });

  it('flags an invented quantity', () => {
    expect(unknownNumbersIn('Hi Ada, I have 3 bottles waiting.', facts)).toEqual(['3']);
  });
});

describe('message generation service', () => {
  it('uses templates when AI is disabled', async () => {
    const result = await generateMessage('HOT_LEAD', facts, { aiEnabled: false });
    expect(result.source).toBe('TEMPLATE');
    expect(result.text).toContain('Glow Serum');
  });

  it('uses templates when AI is enabled but no provider is configured', async () => {
    const result = await generateMessage('HOT_LEAD', facts, { aiEnabled: true });
    expect(result.source).toBe('TEMPLATE');
  });

  it('uses valid AI output when it passes the guardrails', async () => {
    const result = await generateMessage('HOT_LEAD', facts, {
      aiEnabled: true,
      provider: providerReturning(
        'Hi Ada 😊 You asked about the Glow Serum 4 days ago — would you like me to set one aside?',
      ),
    });
    expect(result.source).toBe('AI');
    expect(result.text).toContain('Ada');
  });

  it('falls back to the template when the AI invents a price', async () => {
    const result = await generateMessage('HOT_LEAD', facts, {
      aiEnabled: true,
      provider: providerReturning('Hi Ada, the Glow Serum is ₦12,500 today only!'),
    });
    expect(result.source).toBe('TEMPLATE');
    expect(result.fallbackReason).toContain('guardrail');
    expect(result.text).not.toContain('12,500');
  });

  it('falls back to the template when the AI claims stock', async () => {
    const result = await generateMessage('REORDER', facts, {
      aiEnabled: true,
      provider: providerReturning('Hi Ada, your Glow Serum is back in stock!'),
    });
    expect(result.source).toBe('TEMPLATE');
    expect(result.fallbackReason).toContain('stock claim');
  });

  it('falls back to the template when the provider throws', async () => {
    const result = await generateMessage('DEBTOR', facts, {
      aiEnabled: true,
      provider: providerThatFails(new Error('network down')),
    });
    expect(result.source).toBe('TEMPLATE');
    expect(result.fallbackReason).toContain('ai_error');
    expect(result.text).toContain('₦20,000');
  });

  it('strips quotes and preamble from AI output', async () => {
    const result = await generateMessage('REACTIVATION', facts, {
      aiEnabled: true,
      provider: providerReturning(
        '"Hi Ada 😊 It has been a while since your last order. Can I help you with anything?"',
      ),
    });
    expect(result.source).toBe('AI');
    expect(result.text.startsWith('"')).toBe(false);
  });

  it('always produces a usable message for every category', async () => {
    for (const category of MESSAGE_CATEGORIES) {
      const result = await generateMessage(category, facts);
      expect(result.text.length).toBeGreaterThan(10);
      expect(validateMessage(result.text, facts).ok).toBe(true);
    }
  });

  it('honours a business template override', async () => {
    const result = await generateMessage('REORDER', facts, {
      templateOverride: 'Hi {{first_name}}, time for another {{product}}?',
    });
    expect(result.text).toBe('Hi Ada, time for another Glow Serum?');
  });
});
