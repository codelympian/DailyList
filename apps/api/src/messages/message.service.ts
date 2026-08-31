import { Injectable, NotFoundException } from '@nestjs/common';
import { loadEnv } from '@dailylist/config';
import type { MessageCategory } from '@dailylist/database';
import {
  DEFAULT_TEMPLATES,
  generateMessage,
  MESSAGE_CATEGORIES,
  RECOMMENDATION_TO_MESSAGE_CATEGORY,
  type GeneratedMessage,
  type MessageFacts,
} from '@dailylist/messaging';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicProvider } from './anthropic.provider';

export interface MessagePreviewInput {
  customerId: string;
  category: MessageCategory;
}

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: AnthropicProvider,
  ) {}

  /** Whether AI rewording is actually usable right now. */
  private get aiEnabled(): boolean {
    return loadEnv().AI_MESSAGES_ENABLED && this.provider.isAvailable;
  }

  /**
   * Builds the fact set for a customer strictly from stored data. Anything
   * a message may mention has to come from here.
   */
  async factsForCustomer(businessId: string, customerId: string): Promise<MessageFacts> {
    const [business, customer] = await Promise.all([
      this.prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
      this.prisma.customer.findFirst({ where: { id: customerId, businessId, deletedAt: null } }),
    ]);
    if (!customer) throw new NotFoundException('Customer not found');

    const [openLead, lastItem, openTransactions] = await Promise.all([
      this.prisma.lead.findFirst({
        where: { businessId, customerId, status: { notIn: ['WON', 'LOST'] } },
        orderBy: { lastActivityAt: 'desc' },
        include: { product: { select: { name: true } } },
      }),
      this.prisma.transactionItem.findFirst({
        where: { businessId, transaction: { customerId, status: { not: 'CANCELLED' } } },
        orderBy: { transaction: { occurredAt: 'desc' } },
        include: { product: { select: { name: true, reorderIntervalDays: true } } },
      }),
      this.prisma.transaction.findMany({
        where: { businessId, customerId, status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
        select: { amount: true, amountPaid: true },
      }),
    ]);

    const debt = openTransactions.reduce(
      (sum, t) => sum + t.amount.minus(t.amountPaid).toNumber(),
      0,
    );

    const facts: MessageFacts = {
      businessName: business.name,
      customerName: customer.name,
    };

    const productName =
      openLead?.product?.name ??
      openLead?.description ??
      lastItem?.product?.name ??
      lastItem?.description;
    if (productName) facts.productName = productName;
    if (debt > 0) facts.outstandingAmount = formatNaira(debt);
    if (openLead) facts.daysSinceInterest = daysBetween(openLead.lastActivityAt, new Date());
    if (customer.lastPurchaseAt) {
      facts.daysSinceLastPurchase = daysBetween(customer.lastPurchaseAt, new Date());
    }
    if (lastItem?.product?.reorderIntervalDays) {
      facts.reorderIntervalDays = lastItem.product.reorderIntervalDays;
    }

    return facts;
  }

  /** Generates a message for an arbitrary customer/category (preview). */
  async preview(businessId: string, input: MessagePreviewInput): Promise<GeneratedMessage> {
    const facts = await this.factsForCustomer(businessId, input.customerId);
    return this.generate(businessId, input.category, facts);
  }

  /**
   * Fills (or refreshes) the suggested message on a recommendation and
   * persists it, so the daily list always carries a ready-to-send message.
   */
  async generateForRecommendation(
    businessId: string,
    recommendationId: string,
  ): Promise<GeneratedMessage> {
    const recommendation = await this.prisma.dailyRecommendation.findFirst({
      where: { id: recommendationId, businessId },
    });
    if (!recommendation) throw new NotFoundException('Recommendation not found');

    const category = RECOMMENDATION_TO_MESSAGE_CATEGORY[recommendation.category] ?? 'REACTIVATION';
    const facts = await this.factsForCustomer(businessId, recommendation.customerId);
    const message = await this.generate(businessId, category as MessageCategory, facts);

    await this.prisma.dailyRecommendation.update({
      where: { id: recommendation.id },
      data: { suggestedMessage: message.text },
    });
    return message;
  }

  /** Core generation: business template override → template → optional AI. */
  async generate(
    businessId: string,
    category: MessageCategory,
    facts: MessageFacts,
  ): Promise<GeneratedMessage> {
    const override = await this.prisma.messageTemplate.findFirst({
      where: { businessId, category, active: true },
    });

    return generateMessage(category, facts, {
      aiEnabled: this.aiEnabled,
      provider: this.aiEnabled ? this.provider : undefined,
      ...(override ? { templateOverride: override.body } : {}),
    });
  }

  /** The template in use per category: business override or packaged default. */
  async listTemplates(
    businessId: string,
  ): Promise<
    { category: MessageCategory; body: string; source: 'BUSINESS' | 'DEFAULT'; active: boolean }[]
  > {
    const overrides = await this.prisma.messageTemplate.findMany({ where: { businessId } });
    const byCategory = new Map(overrides.map((t) => [t.category, t]));

    return MESSAGE_CATEGORIES.map((category) => {
      const override = byCategory.get(category);
      return override && override.active
        ? { category, body: override.body, source: 'BUSINESS' as const, active: true }
        : {
            category,
            body: DEFAULT_TEMPLATES[category],
            source: 'DEFAULT' as const,
            active: override?.active ?? true,
          };
    });
  }

  async upsertTemplate(
    businessId: string,
    input: { category: MessageCategory; body: string; active?: boolean },
  ): Promise<{ category: MessageCategory; body: string; active: boolean }> {
    const template = await this.prisma.messageTemplate.upsert({
      where: { businessId_category: { businessId, category: input.category } },
      create: {
        businessId,
        category: input.category,
        body: input.body,
        active: input.active ?? true,
      },
      update: { body: input.body, active: input.active ?? true },
    });
    return { category: template.category, body: template.body, active: template.active };
  }

  /** Bulk fill for a day's list; used right after generation. */
  async fillMissingForDate(businessId: string, date: Date): Promise<number> {
    const pending = await this.prisma.dailyRecommendation.findMany({
      where: { businessId, recommendationDate: date, suggestedMessage: null },
      select: { id: true },
    });
    for (const row of pending) {
      await this.generateForRecommendation(businessId, row.id);
    }
    return pending.length;
  }
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
}
