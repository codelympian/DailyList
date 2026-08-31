import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import type { BusinessMembership, User } from '@dailylist/database';
import { MESSAGE_CATEGORIES, type GeneratedMessage } from '@dailylist/messaging';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  BusinessMemberGuard,
  CurrentMembership,
  RequireRoles,
} from '../businesses/business-member.guard';
import { MessageService } from './message.service';

const previewSchema = z.object({
  customerId: z.string().uuid(),
  category: z.enum(MESSAGE_CATEGORIES),
});

const templateSchema = z.object({
  category: z.enum(MESSAGE_CATEGORIES),
  body: z.string().trim().min(10).max(600),
  active: z.boolean().optional(),
});

/** Records what the owner did — the only two things we can observe. */
const recordActionSchema = z.object({
  customerId: z.string().uuid(),
  recommendationId: z.string().uuid().optional(),
  action: z.enum(['WHATSAPP_OPENED', 'COPIED']),
  body: z.string().trim().min(1).max(4096),
});

const linkQuerySchema = z.object({
  recommendationId: z.string().uuid().optional(),
});

type PreviewInput = z.infer<typeof previewSchema>;
type TemplateInput = z.infer<typeof templateSchema>;
type RecordActionInput = z.infer<typeof recordActionSchema>;
type LinkQuery = z.infer<typeof linkQuerySchema>;

@Controller('businesses/:businessId/messages')
@UseGuards(SessionAuthGuard, BusinessMemberGuard)
export class MessageController {
  constructor(private readonly messages: MessageService) {}

  /** Preview the message that would be suggested for a customer. */
  @Post('preview')
  @HttpCode(200)
  preview(
    @CurrentMembership() membership: BusinessMembership,
    @Body(new ZodValidationPipe(previewSchema)) input: PreviewInput,
  ): Promise<GeneratedMessage> {
    return this.messages.preview(membership.businessId, input);
  }

  /** The built-in and business-specific templates in use. */
  @Get('templates')
  async templates(@CurrentMembership() membership: BusinessMembership) {
    return this.messages.listTemplates(membership.businessId);
  }

  @Put('templates')
  @RequireRoles('OWNER', 'ADMIN')
  upsertTemplate(
    @CurrentMembership() membership: BusinessMembership,
    @Body(new ZodValidationPipe(templateSchema)) input: TemplateInput,
  ) {
    return this.messages.upsertTemplate(membership.businessId, input);
  }

  /**
   * Records that the owner opened WhatsApp or copied the message.
   * This is an act of initiating contact — not proof of delivery.
   */
  @Post()
  @HttpCode(201)
  record(
    @CurrentMembership() membership: BusinessMembership,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(recordActionSchema)) input: RecordActionInput,
  ) {
    return this.messages.recordAction(membership.businessId, user.id, input);
  }
}

@Controller('businesses/:businessId/customers/:customerId')
@UseGuards(SessionAuthGuard, BusinessMemberGuard)
export class CustomerMessageController {
  constructor(private readonly messages: MessageService) {}

  /** The click-to-chat link for this customer. Records nothing. */
  @Get('whatsapp-link')
  link(
    @CurrentMembership() membership: BusinessMembership,
    @Param('customerId', new ParseUUIDPipe({ version: '4' })) customerId: string,
    @Query(new ZodValidationPipe(linkQuerySchema)) query: LinkQuery,
  ) {
    return this.messages.whatsappLink(membership.businessId, customerId, query.recommendationId);
  }

  /** Contact attempts recorded for this customer. */
  @Get('messages')
  history(
    @CurrentMembership() membership: BusinessMembership,
    @Param('customerId', new ParseUUIDPipe({ version: '4' })) customerId: string,
  ) {
    return this.messages.historyForCustomer(membership.businessId, customerId);
  }
}

@Controller('businesses/:businessId/recommendations/:id/message')
@UseGuards(SessionAuthGuard, BusinessMemberGuard)
export class RecommendationMessageController {
  constructor(private readonly messages: MessageService) {}

  /** Generate (or regenerate) the suggested message for a recommendation. */
  @Post()
  @HttpCode(200)
  generate(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<GeneratedMessage> {
    return this.messages.generateForRecommendation(membership.businessId, id);
  }
}
