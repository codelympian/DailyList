import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { BusinessMembership } from '@dailylist/database';
import type {
  BusinessSettingsResponse,
  CustomerIntelligenceView,
  Paginated,
  SegmentCounts,
} from '@dailylist/types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import {
  BusinessMemberGuard,
  CurrentMembership,
  RequireRoles,
} from '../businesses/business-member.guard';
import { IntelligenceService } from './intelligence.service';
import { SettingsService } from './settings.service';
import {
  listSegmentQuerySchema,
  optOutSchema,
  updateSettingsSchema,
  type ListSegmentQuery,
  type OptOutInput,
  type UpdateSettingsInput,
} from './intelligence.schemas';

@Controller('businesses/:businessId')
@UseGuards(SessionAuthGuard, BusinessMemberGuard)
export class IntelligenceController {
  constructor(
    private readonly intelligence: IntelligenceService,
    private readonly settings: SettingsService,
  ) {}

  @Get('settings')
  getSettings(
    @CurrentMembership() membership: BusinessMembership,
  ): Promise<BusinessSettingsResponse> {
    return this.settings.get(membership.businessId);
  }

  @Patch('settings')
  @RequireRoles('OWNER', 'ADMIN')
  updateSettings(
    @CurrentMembership() membership: BusinessMembership,
    @Body(new ZodValidationPipe(updateSettingsSchema)) input: UpdateSettingsInput,
  ): Promise<BusinessSettingsResponse> {
    return this.settings.update(membership.businessId, input);
  }

  @Get('intelligence/segments')
  counts(@CurrentMembership() membership: BusinessMembership): Promise<SegmentCounts> {
    return this.intelligence.counts(membership.businessId);
  }

  @Get('intelligence/customers')
  listBySegment(
    @CurrentMembership() membership: BusinessMembership,
    @Query(new ZodValidationPipe(listSegmentQuerySchema)) query: ListSegmentQuery,
  ): Promise<Paginated<CustomerIntelligenceView>> {
    return this.intelligence.listBySegment(membership.businessId, query);
  }

  @Get('customers/:id/intelligence')
  forCustomer(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CustomerIntelligenceView> {
    return this.intelligence.forCustomer(membership.businessId, id);
  }

  @Post('customers/:id/communication-preference')
  @HttpCode(200)
  @RequireRoles('OWNER', 'ADMIN')
  setPreference(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(optOutSchema)) input: OptOutInput,
  ): Promise<{ channel: string; optedIn: boolean }> {
    return this.intelligence.setCommunicationPreference(membership.businessId, id, input);
  }
}
