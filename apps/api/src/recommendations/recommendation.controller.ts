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
import type { Paginated } from '@dailylist/types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import {
  BusinessMemberGuard,
  CurrentMembership,
  RequireRoles,
} from '../businesses/business-member.guard';
import {
  RecommendationService,
  type DailyListSummary,
  type RecommendationView,
} from './recommendation.service';
import {
  listRecommendationsQuerySchema,
  updateRecommendationStatusSchema,
  type ListRecommendationsQuery,
  type UpdateRecommendationStatusInput,
} from './recommendation.schemas';

@Controller('businesses/:businessId/recommendations')
@UseGuards(SessionAuthGuard, BusinessMemberGuard)
export class RecommendationController {
  constructor(private readonly recommendations: RecommendationService) {}

  /** Today's list (generated on the first request of the day). */
  @Get()
  list(
    @CurrentMembership() membership: BusinessMembership,
    @Query(new ZodValidationPipe(listRecommendationsQuerySchema)) query: ListRecommendationsQuery,
  ): Promise<Paginated<RecommendationView>> {
    return this.recommendations.list(membership.businessId, query);
  }

  @Get('summary')
  summary(@CurrentMembership() membership: BusinessMembership): Promise<DailyListSummary> {
    return this.recommendations.summary(membership.businessId);
  }

  /** Force a refresh, e.g. after recording new sales. */
  @Post('generate')
  @HttpCode(200)
  @RequireRoles('OWNER', 'ADMIN')
  generate(@CurrentMembership() membership: BusinessMembership): Promise<DailyListSummary> {
    return this.recommendations.generate(membership.businessId);
  }

  @Patch(':id/status')
  setStatus(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateRecommendationStatusSchema))
    input: UpdateRecommendationStatusInput,
  ): Promise<RecommendationView> {
    return this.recommendations.setStatus(membership.businessId, id, input.status);
  }
}
