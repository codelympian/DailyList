import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import type { BusinessMembership } from '@dailylist/database';
import { MESSAGE_CATEGORIES, type GeneratedMessage } from '@dailylist/messaging';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/session-auth.guard';
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

type PreviewInput = z.infer<typeof previewSchema>;
type TemplateInput = z.infer<typeof templateSchema>;

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
