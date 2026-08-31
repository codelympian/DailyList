import { Injectable, NotFoundException } from '@nestjs/common';
import { loadEnv } from '@dailylist/config';
import type { MessageAction, MessageCategory } from '@dailylist/database';
import {
  buildWhatsAppLink,
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

export interface WhatsAppLinkResponse {
  ok: boolean;
  url: string | null;
  phone: string | null;
  body: string;
  error: string | null;
}

export interface RecordMessageInput {
  customerId: string;
  recommendationId?: string;
  action: MessageAction;
  body: string;
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

  /**
   * Builds the click-to-chat link for a customer without recording anything.
   * Used to render the Send button; the action is recorded separately when
   * the owner actually taps it.
   */
  async whatsappLink(
    businessId: string,
    customerId: string,
    recommendationId?: string,
  ): Promise<WhatsAppLinkResponse> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    let body: string | null = null;
    if (recommendationId) {
      const recommendation = await this.prisma.dailyRecommendation.findFirst({
        where: { id: recommendationId, businessId, customerId },
      });
      if (!recommendation) throw new NotFoundException('Recommendation not found');
      body = recommendation.suggestedMessage;
    }
    if (!body) {
      const facts = await this.factsForCustomer(businessId, customerId);
      body = (await this.generate(businessId, 'REACTIVATION', facts)).text;
    }

    const link = buildWhatsAppLink(customer.phone, body);
    return {
      ok: link.ok,
      url: link.url ?? null,
      phone: link.phone ?? null,
      body,
      error: link.error ?? null,
    };
  }

  /**
   * Records that the owner initiated contact.
   *
   * We record only the act — opening WhatsApp or copying the text. The app
   * has no delivery or read information and must never imply it has.
   * Recording a send also updates contact fatigue, which is what keeps the
   * customer off the next few days' lists.
   */
  async recordAction(
    businessId: string,
    userId: string,
    input: RecordMessageInput,
  ): Promise<{ id: string; action: MessageAction; createdAt: string }> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: input.customerId, businessId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    if (input.recommendationId) {
      const exists = await this.prisma.dailyRecommendation.findFirst({
        where: { id: input.recommendationId, businessId, customerId: input.customerId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Recommendation not found');
    }

    const now = new Date();
    const countsAsContact = input.action === 'WHATSAPP_OPENED';

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          businessId,
          customerId: input.customerId,
          recommendationId: input.recommendationId ?? null,
          sentById: userId,
          channel: 'WHATSAPP',
          action: input.action,
          body: input.body,
          toPhone: customer.phone,
        },
      });

      if (countsAsContact) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { lastContactedAt: now, contactAttemptCount: { increment: 1 } },
        });
        await tx.customerEvent.create({
          data: {
            businessId,
            customerId: customer.id,
            type: 'MESSAGE_SENT',
            // Wording is precise on purpose: we know it was opened, not sent.
            title: 'Opened WhatsApp to contact this customer',
            payload: { messageId: created.id, channel: 'WHATSAPP' },
            occurredAt: now,
          },
        });
        // A pending card becomes CONTACTED; a handled one is left alone.
        if (input.recommendationId) {
          await tx.dailyRecommendation.updateMany({
            where: { id: input.recommendationId, businessId, status: 'PENDING' },
            data: { status: 'CONTACTED', completedAt: now },
          });
        }
      }

      return created;
    });

    return {
      id: message.id,
      action: message.action,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /** Contact history for a customer — acts initiated, never delivery status. */
  async historyForCustomer(
    businessId: string,
    customerId: string,
    limit = 50,
  ): Promise<
    { id: string; action: MessageAction; body: string; toPhone: string | null; createdAt: string }[]
  > {
    const rows = await this.prisma.message.findMany({
      where: { businessId, customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      body: row.body,
      toPhone: row.toPhone,
      createdAt: row.createdAt.toISOString(),
    }));
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
