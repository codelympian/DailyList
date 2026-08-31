import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { loadEnv } from '@dailylist/config';
import type { LlmProvider } from '@dailylist/messaging';

/**
 * The only place the LLM SDK is touched. Everything else talks to the
 * `LlmProvider` port, so message generation stays testable and the product
 * runs unchanged when AI is disabled or unavailable.
 */
@Injectable()
export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic | null;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor() {
    const env = loadEnv();
    this.model = env.AI_MESSAGE_MODEL;
    this.timeoutMs = env.AI_MESSAGE_TIMEOUT_MS;
    this.client =
      env.AI_MESSAGES_ENABLED && env.ANTHROPIC_API_KEY
        ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: this.timeoutMs })
        : null;

    if (env.AI_MESSAGES_ENABLED && !env.ANTHROPIC_API_KEY) {
      this.logger.warn(
        'AI_MESSAGES_ENABLED is true but ANTHROPIC_API_KEY is not set; using templates',
      );
    }
  }

  /** True only when AI is both enabled and actually configured. */
  get isAvailable(): boolean {
    return this.client !== null;
  }

  async complete(input: { system: string; prompt: string; maxTokens: number }): Promise<string> {
    if (!this.client) throw new Error('AI provider is not configured');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: input.maxTokens,
      system: input.system,
      messages: [{ role: 'user', content: input.prompt }],
    });

    // A refusal is a normal outcome, not an exception — treat it as failure
    // so the caller falls back to the deterministic template.
    if (response.stop_reason === 'refusal') {
      throw new Error('Model declined to generate this message');
    }

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();
  }
}
