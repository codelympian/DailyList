import { Injectable, NotFoundException } from '@nestjs/common';
import type { CustomerIntelligenceView, Paginated, Segment, SegmentCounts } from '@dailylist/types';
import {
  computeIntelligence,
  explainSegment,
  explainSuppression,
  SEGMENTS,
  type CustomerIntelligence,
} from '@dailylist/scoring';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureRepository } from './feature.repository';
import { SettingsService } from './settings.service';
import type { ListSegmentQuery, OptOutInput } from './intelligence.schemas';

@Injectable()
export class IntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeatureRepository,
    private readonly settings: SettingsService,
  ) {}

  /** Intelligence for a single customer, with human-readable reasons. */
  async forCustomer(businessId: string, customerId: string): Promise<CustomerIntelligenceView> {
    const [inputs, settings] = await Promise.all([
      this.features.loadForBusiness(businessId, [customerId]),
      this.settings.getEngineSettings(businessId),
    ]);
    const input = inputs[0];
    if (!input) throw new NotFoundException('Customer not found');
    return toView(computeIntelligence(input, settings, new Date()), input.name);
  }

  /** Segment counts across the whole business. */
  async counts(businessId: string): Promise<SegmentCounts> {
    const [inputs, settings] = await Promise.all([
      this.features.loadForBusiness(businessId),
      this.settings.getEngineSettings(businessId),
    ]);
    const now = new Date();

    const counts = emptyCounts();
    const eligibleCounts = emptyCounts();
    let suppressed = 0;

    for (const input of inputs) {
      const result = computeIntelligence(input, settings, now);
      if (result.suppression.suppressed) suppressed++;
      for (const match of result.segments) counts[match.segment]++;
      for (const match of result.eligibleSegments) eligibleCounts[match.segment]++;
    }

    return {
      counts,
      eligibleCounts,
      totalCustomers: inputs.length,
      suppressedCustomers: suppressed,
      computedAt: now.toISOString(),
    };
  }

  /** Customers in a segment (eligible only unless includeSuppressed). */
  async listBySegment(
    businessId: string,
    query: ListSegmentQuery,
  ): Promise<Paginated<CustomerIntelligenceView>> {
    const [inputs, settings] = await Promise.all([
      this.features.loadForBusiness(businessId),
      this.settings.getEngineSettings(businessId),
    ]);
    const now = new Date();

    const views = inputs
      .map((input) => ({ result: computeIntelligence(input, settings, now), name: input.name }))
      .filter(({ result }) => {
        const pool = query.includeSuppressed ? result.segments : result.eligibleSegments;
        if (pool.length === 0) return false;
        return query.segment ? pool.some((m) => m.segment === query.segment) : true;
      })
      .map(({ result, name }) => toView(result, name));

    const start = (query.page - 1) * query.pageSize;
    return {
      items: views.slice(start, start + query.pageSize),
      total: views.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Records consent for a channel; opting out removes the customer from follow-ups. */
  async setCommunicationPreference(
    businessId: string,
    customerId: string,
    input: OptOutInput,
  ): Promise<{ channel: string; optedIn: boolean }> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const now = new Date();
    const preference = await this.prisma.communicationPreference.upsert({
      where: { customerId_channel: { customerId, channel: input.channel } },
      create: {
        businessId,
        customerId,
        channel: input.channel,
        optedIn: input.optedIn,
        optedInAt: input.optedIn ? now : null,
        optedOutAt: input.optedIn ? null : now,
        source: input.source ?? 'MANUAL',
      },
      update: {
        optedIn: input.optedIn,
        optedInAt: input.optedIn ? now : undefined,
        optedOutAt: input.optedIn ? null : now,
        source: input.source ?? 'MANUAL',
      },
    });
    return { channel: preference.channel, optedIn: preference.optedIn };
  }
}

function emptyCounts(): Record<Segment, number> {
  return Object.fromEntries(SEGMENTS.map((s) => [s, 0])) as Record<Segment, number>;
}

function toView(result: CustomerIntelligence, customerName: string): CustomerIntelligenceView {
  const f = result.features;
  return {
    customerId: result.customerId,
    customerName,
    lifecycleStage: result.lifecycleStage,
    segments: result.segments.map((match) => ({
      segment: match.segment,
      reasonCodes: match.reasonCodes,
      reasons: explainSegment(match, customerName),
      facts: match.facts,
    })),
    eligible: !result.suppression.suppressed,
    suppressionCodes: result.suppression.codes,
    suppressionReasons: result.suppression.codes.map(explainSuppression),
    features: {
      purchaseCount: f.purchaseCount,
      totalSpend: f.totalSpend,
      outstandingDebt: f.outstandingDebt,
      daysSinceLastPurchase: f.daysSinceLastPurchase,
      daysSinceLastContact: f.daysSinceLastContact,
      expectedReorderIntervalDays: f.expectedReorderIntervalDays,
      reorderIntervalSource: f.reorderIntervalSource,
      daysUntilReorderDue: f.daysUntilReorderDue,
    },
  };
}
