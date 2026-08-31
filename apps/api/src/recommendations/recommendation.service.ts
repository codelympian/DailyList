import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, DailyRecommendation, RecommendationStatus } from '@dailylist/database';
import type { Paginated } from '@dailylist/types';
import {
  computeIntelligence,
  explainSegment,
  rankCandidates,
  RECOMMENDATION_CATEGORIES,
  scoreCandidate,
  type RecommendationCategory,
} from '@dailylist/scoring';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureRepository } from '../intelligence/feature.repository';
import { SettingsService } from '../intelligence/settings.service';
import { MessageService } from '../messages/message.service';
import type { ListRecommendationsQuery } from './recommendation.schemas';

/** Statuses that mean the owner already dealt with this card. */
const ACTED_ON: RecommendationStatus[] = [
  'CONTACTED',
  'COMPLETED',
  'SKIPPED',
  'DISMISSED',
  'CONVERTED',
];

/** Marking one of these records an actual contact attempt. */
const COUNTS_AS_CONTACT: RecommendationStatus[] = ['CONTACTED', 'COMPLETED', 'CONVERTED'];

export interface RecommendationView {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  recommendationDate: string;
  category: RecommendationCategory;
  score: number;
  segments: string[];
  reasonCodes: string[];
  reasonText: string[];
  suggestedMessage: string | null;
  status: RecommendationStatus;
  completedAt: string | null;
}

export interface DailyListSummary {
  date: string;
  total: number;
  pending: number;
  done: number;
  byCategory: Record<RecommendationCategory, number>;
  generatedAt: string | null;
}

@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeatureRepository,
    private readonly settings: SettingsService,
    private readonly messages: MessageService,
  ) {}

  /**
   * The full pipeline:
   *   customer data → features → eligibility → suppression
   *   → candidate pool → scoring → ranking → top N → reasons → snapshot
   *
   * Idempotent: re-running on the same day refreshes PENDING cards but
   * never overwrites a card the owner already acted on.
   */
  async generate(businessId: string, date: Date = new Date()): Promise<DailyListSummary> {
    const day = startOfDayUtc(date);
    const [inputs, settings] = await Promise.all([
      this.features.loadForBusiness(businessId),
      this.settings.getOrCreate(businessId),
    ]);
    const engineSettings = await this.settings.getEngineSettings(businessId);

    // Candidate pool: eligible (not suppressed) customers with an actionable category.
    const candidates = inputs.flatMap((input) => {
      const intelligence = computeIntelligence(input, engineSettings, date);
      if (intelligence.suppression.suppressed) return [];

      const scored = scoreCandidate(
        intelligence.features,
        intelligence.eligibleSegments,
        engineSettings,
      );
      if (!scored) return [];

      const primary = intelligence.eligibleSegments.find((s) => s.segment === scored.category);
      const reasonText = primary ? explainSegment(primary, input.name) : [];

      return [{ customerId: input.customerId, scored, reasonText }];
    });

    const top = rankCandidates(
      candidates.map((c) => ({ ...c, score: c.scored.score, category: c.scored.category })),
    ).slice(0, settings.dailyListSize);

    const existing = await this.prisma.dailyRecommendation.findMany({
      where: { businessId, recommendationDate: day },
      select: { id: true, customerId: true, status: true },
    });
    const existingByCustomer = new Map(existing.map((r) => [r.customerId, r]));
    const keepIds = new Set<string>();

    for (const candidate of top) {
      const current = existingByCustomer.get(candidate.customerId);
      if (current) keepIds.add(current.id);

      // Never rewrite a card the owner already handled.
      if (current && ACTED_ON.includes(current.status)) continue;

      await this.prisma.dailyRecommendation.upsert({
        where: {
          businessId_customerId_recommendationDate: {
            businessId,
            customerId: candidate.customerId,
            recommendationDate: day,
          },
        },
        create: {
          businessId,
          customerId: candidate.customerId,
          recommendationDate: day,
          category: candidate.scored.category,
          score: candidate.scored.score,
          segments: candidate.scored.segments,
          reasonCodes: candidate.scored.reasonCodes,
          reasonText: candidate.reasonText,
          scoreBreakdown: candidate.scored.breakdown as unknown as Prisma.InputJsonValue,
        },
        update: {
          category: candidate.scored.category,
          score: candidate.scored.score,
          segments: candidate.scored.segments,
          reasonCodes: candidate.scored.reasonCodes,
          reasonText: candidate.reasonText,
          scoreBreakdown: candidate.scored.breakdown as unknown as Prisma.InputJsonValue,
        },
      });
    }

    // Drop untouched cards that no longer qualify (e.g. the customer bought).
    const staleIds = existing
      .filter((r) => !keepIds.has(r.id) && !ACTED_ON.includes(r.status))
      .map((r) => r.id);
    if (staleIds.length > 0) {
      await this.prisma.dailyRecommendation.deleteMany({ where: { id: { in: staleIds } } });
    }

    // Every card ships with a ready-to-send message (deterministic by default).
    await this.messages.fillMissingForDate(businessId, day);

    return this.summary(businessId, day);
  }

  /** Today's list, generating it on first request of the day. */
  async list(
    businessId: string,
    query: ListRecommendationsQuery,
  ): Promise<Paginated<RecommendationView>> {
    const day = query.date ? startOfDayUtc(query.date) : startOfDayUtc(new Date());

    const isToday = day.getTime() === startOfDayUtc(new Date()).getTime();
    if (isToday) {
      const count = await this.prisma.dailyRecommendation.count({
        where: { businessId, recommendationDate: day },
      });
      if (count === 0) await this.generate(businessId, new Date());
    }

    const where: Prisma.DailyRecommendationWhereInput = { businessId, recommendationDate: day };
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.dailyRecommendation.count({ where }),
      this.prisma.dailyRecommendation.findMany({
        where,
        include: { customer: { select: { name: true, phone: true } } },
        orderBy: [{ score: 'desc' }, { customerId: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items: items.map(toView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async summary(businessId: string, date: Date = new Date()): Promise<DailyListSummary> {
    const day = startOfDayUtc(date);
    const rows = await this.prisma.dailyRecommendation.findMany({
      where: { businessId, recommendationDate: day },
      select: { category: true, status: true, createdAt: true },
    });

    const byCategory = Object.fromEntries(RECOMMENDATION_CATEGORIES.map((c) => [c, 0])) as Record<
      RecommendationCategory,
      number
    >;
    let pending = 0;
    let generatedAt: Date | null = null;

    for (const row of rows) {
      byCategory[row.category as RecommendationCategory]++;
      if (row.status === 'PENDING') pending++;
      if (!generatedAt || row.createdAt < generatedAt) generatedAt = row.createdAt;
    }

    return {
      date: day.toISOString().slice(0, 10),
      total: rows.length,
      pending,
      done: rows.length - pending,
      byCategory,
      generatedAt: generatedAt?.toISOString() ?? null,
    };
  }

  /**
   * Records what the owner did with a card. Statuses that represent a real
   * contact attempt also update the customer's contact-fatigue fields, which
   * is what keeps them off tomorrow's list.
   */
  async setStatus(
    businessId: string,
    recommendationId: string,
    status: RecommendationStatus,
  ): Promise<RecommendationView> {
    const existing = await this.prisma.dailyRecommendation.findFirst({
      where: { id: recommendationId, businessId },
    });
    if (!existing) throw new NotFoundException('Recommendation not found');
    if (status === 'PENDING' && existing.status !== 'PENDING') {
      throw new BadRequestException('A recommendation cannot be moved back to pending');
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const recommendation = await tx.dailyRecommendation.update({
        where: { id: recommendationId },
        data: {
          status,
          completedAt: status === 'PENDING' ? null : now,
        },
        include: { customer: { select: { name: true, phone: true } } },
      });

      if (COUNTS_AS_CONTACT.includes(status)) {
        await tx.customer.update({
          where: { id: existing.customerId },
          data: {
            lastContactedAt: now,
            contactAttemptCount: { increment: 1 },
          },
        });
        await tx.customerEvent.create({
          data: {
            businessId,
            customerId: existing.customerId,
            type: status === 'CONVERTED' ? 'FOLLOW_UP_COMPLETED' : 'FOLLOW_UP',
            title:
              status === 'CONVERTED'
                ? 'Follow-up led to a sale'
                : `Followed up (${existing.category.toLowerCase().replace('_', ' ')})`,
            payload: { recommendationId, status },
            occurredAt: now,
          },
        });
      } else if (status === 'SKIPPED') {
        await tx.customerEvent.create({
          data: {
            businessId,
            customerId: existing.customerId,
            type: 'FOLLOW_UP_SKIPPED',
            title: 'Follow-up skipped',
            payload: { recommendationId },
            occurredAt: now,
          },
        });
      }

      return recommendation;
    });

    return toView(updated);
  }

  /** Recommendation history for one customer (analytics foundation). */
  async historyForCustomer(
    businessId: string,
    customerId: string,
    limit = 30,
  ): Promise<RecommendationView[]> {
    const rows = await this.prisma.dailyRecommendation.findMany({
      where: { businessId, customerId },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { recommendationDate: 'desc' },
      take: limit,
    });
    return rows.map(toView);
  }
}

type RecommendationWithCustomer = DailyRecommendation & {
  customer: { name: string; phone: string | null };
};

function toView(row: RecommendationWithCustomer): RecommendationView {
  return {
    id: row.id,
    customerId: row.customerId,
    customerName: row.customer.name,
    customerPhone: row.customer.phone,
    recommendationDate: row.recommendationDate.toISOString().slice(0, 10),
    category: row.category as RecommendationCategory,
    score: row.score,
    segments: row.segments,
    reasonCodes: row.reasonCodes,
    reasonText: row.reasonText,
    suggestedMessage: row.suggestedMessage,
    status: row.status,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

/** Date-only key so "today's list" is stable regardless of time of day. */
export function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
