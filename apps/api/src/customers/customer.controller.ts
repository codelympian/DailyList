import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { BusinessMembership } from '@dailylist/database';
import type { CustomerDetail, CustomerSummary, Paginated, TimelineEvent } from '@dailylist/types';
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type ListCustomersQuery,
  type UpdateCustomerInput,
} from '@dailylist/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import {
  BusinessMemberGuard,
  CurrentMembership,
  RequireRoles,
} from '../businesses/business-member.guard';
import { CustomerService } from './customer.service';

@Controller('businesses/:businessId/customers')
@UseGuards(SessionAuthGuard, BusinessMemberGuard)
export class CustomerController {
  constructor(private readonly customers: CustomerService) {}

  @Post()
  @RequireRoles('OWNER', 'ADMIN')
  create(
    @CurrentMembership() membership: BusinessMembership,
    @Body(new ZodValidationPipe(createCustomerSchema)) input: CreateCustomerInput,
  ): Promise<CustomerDetail> {
    return this.customers.create(membership.businessId, input);
  }

  @Get()
  list(
    @CurrentMembership() membership: BusinessMembership,
    @Query(new ZodValidationPipe(listCustomersQuerySchema)) query: ListCustomersQuery,
  ): Promise<Paginated<CustomerSummary>> {
    return this.customers.list(membership.businessId, query);
  }

  @Get(':id')
  get(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CustomerDetail> {
    return this.customers.get(membership.businessId, id);
  }

  @Patch(':id')
  @RequireRoles('OWNER', 'ADMIN')
  update(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) input: UpdateCustomerInput,
  ): Promise<CustomerDetail> {
    return this.customers.update(membership.businessId, id, input);
  }

  @Delete(':id')
  @RequireRoles('OWNER', 'ADMIN')
  remove(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ ok: true }> {
    return this.customers.remove(membership.businessId, id);
  }

  @Get(':id/timeline')
  timeline(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query(new ZodValidationPipe(listCustomersQuerySchema)) query: ListCustomersQuery,
  ): Promise<Paginated<TimelineEvent>> {
    return this.customers.timeline(membership.businessId, id, query.page, query.pageSize);
  }
}
