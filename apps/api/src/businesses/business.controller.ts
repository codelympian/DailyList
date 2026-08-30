import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import type { User } from '@dailylist/database';
import type { BusinessSummary } from '@dailylist/types';
import { createBusinessSchema, type CreateBusinessInput } from '@dailylist/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { BusinessService } from './business.service';

@Controller('businesses')
@UseGuards(SessionAuthGuard)
export class BusinessController {
  constructor(private readonly businesses: BusinessService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createBusinessSchema)) input: CreateBusinessInput,
  ): Promise<BusinessSummary> {
    return this.businesses.create(user.id, input);
  }

  @Get()
  list(@CurrentUser() user: User): Promise<BusinessSummary[]> {
    return this.businesses.listForUser(user.id);
  }

  @Get(':id')
  get(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<BusinessSummary> {
    return this.businesses.getForUser(user.id, id);
  }
}
