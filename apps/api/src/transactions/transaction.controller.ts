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
import type { Paginated, TransactionDetail, TransactionSummary } from '@dailylist/types';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  recordPaymentSchema,
  updateTransactionStatusSchema,
  type CreateTransactionInput,
  type ListTransactionsQuery,
  type RecordPaymentInput,
  type UpdateTransactionStatusInput,
} from '@dailylist/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import {
  BusinessMemberGuard,
  CurrentMembership,
  RequireRoles,
} from '../businesses/business-member.guard';
import { TransactionService } from './transaction.service';

@Controller('businesses/:businessId/transactions')
@UseGuards(SessionAuthGuard, BusinessMemberGuard)
export class TransactionController {
  constructor(private readonly transactions: TransactionService) {}

  @Post()
  @RequireRoles('OWNER', 'ADMIN')
  create(
    @CurrentMembership() membership: BusinessMembership,
    @Body(new ZodValidationPipe(createTransactionSchema)) input: CreateTransactionInput,
  ): Promise<TransactionDetail> {
    return this.transactions.create(membership.businessId, input);
  }

  @Get()
  list(
    @CurrentMembership() membership: BusinessMembership,
    @Query(new ZodValidationPipe(listTransactionsQuerySchema)) query: ListTransactionsQuery,
  ): Promise<Paginated<TransactionSummary>> {
    return this.transactions.list(membership.businessId, query);
  }

  @Get(':id')
  get(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TransactionDetail> {
    return this.transactions.get(membership.businessId, id);
  }

  @Post(':id/payments')
  @HttpCode(200)
  @RequireRoles('OWNER', 'ADMIN')
  recordPayment(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(recordPaymentSchema)) input: RecordPaymentInput,
  ): Promise<TransactionDetail> {
    return this.transactions.recordPayment(membership.businessId, id, input);
  }

  @Patch(':id/status')
  @RequireRoles('OWNER', 'ADMIN')
  setStatus(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateTransactionStatusSchema)) input: UpdateTransactionStatusInput,
  ): Promise<TransactionDetail> {
    return this.transactions.setStatus(membership.businessId, id, input);
  }
}
