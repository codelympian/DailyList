import { Injectable } from '@nestjs/common';
import type { BusinessSettings } from '@dailylist/database';
import type { BusinessSettingsResponse } from '@dailylist/types';
import type { IntelligenceSettings } from '@dailylist/scoring';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateSettingsInput } from './intelligence.schemas';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the business's settings, creating defaults on first access. */
  async getOrCreate(businessId: string): Promise<BusinessSettings> {
    const existing = await this.prisma.businessSettings.findUnique({ where: { businessId } });
    if (existing) return existing;
    return this.prisma.businessSettings.create({ data: { businessId } });
  }

  async getEngineSettings(businessId: string): Promise<IntelligenceSettings> {
    return toEngineSettings(await this.getOrCreate(businessId));
  }

  async get(businessId: string): Promise<BusinessSettingsResponse> {
    return toResponse(await this.getOrCreate(businessId));
  }

  async update(businessId: string, input: UpdateSettingsInput): Promise<BusinessSettingsResponse> {
    await this.getOrCreate(businessId);
    const updated = await this.prisma.businessSettings.update({
      where: { businessId },
      data: input,
    });
    return toResponse(updated);
  }
}

export function toEngineSettings(settings: BusinessSettings): IntelligenceSettings {
  return {
    vipLifetimeSpend: settings.vipLifetimeSpend.toNumber(),
    repeatCustomerMinPurchases: settings.repeatCustomerMinPurchases,
    defaultReorderIntervalDays: settings.defaultReorderIntervalDays,
    reorderDuePercent: settings.reorderDuePercent,
    lostReorderMultiple: settings.lostReorderMultiple,
    lostCustomerDays: settings.lostCustomerDays,
    hotLeadRecencyDays: settings.hotLeadRecencyDays,
    minContactIntervalDays: settings.minContactIntervalDays,
    recentPurchaseSuppressionDays: settings.recentPurchaseSuppressionDays,
  };
}

function toResponse(settings: BusinessSettings): BusinessSettingsResponse {
  return {
    ...toEngineSettings(settings),
    dailyListSize: settings.dailyListSize,
    businessId: settings.businessId,
    updatedAt: settings.updatedAt.toISOString(),
  };
}
