import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { BusinessMembership } from '@dailylist/database';
import type { LeadSummary, Paginated } from '@dailylist/types';
import {
  createLeadSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
  updateLeadStatusSchema,
  type CreateLeadInput,
  type ListLeadsQuery,
  type UpdateLeadInput,
  type UpdateLeadStatusInput,
} from '@dailylist/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import {
  BusinessMemberGuard,
  CurrentMembership,
  RequireRoles,
} from '../businesses/business-member.guard';
import { LeadService } from './lead.service';

@Controller('businesses/:businessId/leads')
@UseGuards(SessionAuthGuard, BusinessMemberGuard)
export class LeadController {
  constructor(private readonly leads: LeadService) {}

  @Post()
  @RequireRoles('OWNER', 'ADMIN')
  create(
    @CurrentMembership() membership: BusinessMembership,
    @Body(new ZodValidationPipe(createLeadSchema)) input: CreateLeadInput,
  ): Promise<LeadSummary> {
    return this.leads.create(membership.businessId, input);
  }

  @Get()
  list(
    @CurrentMembership() membership: BusinessMembership,
    @Query(new ZodValidationPipe(listLeadsQuerySchema)) query: ListLeadsQuery,
  ): Promise<Paginated<LeadSummary>> {
    return this.leads.list(membership.businessId, query);
  }

  @Get(':id')
  get(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<LeadSummary> {
    return this.leads.get(membership.businessId, id);
  }

  @Patch(':id')
  @RequireRoles('OWNER', 'ADMIN')
  update(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateLeadSchema)) input: UpdateLeadInput,
  ): Promise<LeadSummary> {
    return this.leads.update(membership.businessId, id, input);
  }

  @Patch(':id/status')
  @RequireRoles('OWNER', 'ADMIN')
  setStatus(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateLeadStatusSchema)) input: UpdateLeadStatusInput,
  ): Promise<LeadSummary> {
    return this.leads.setStatus(membership.businessId, id, input);
  }
}
