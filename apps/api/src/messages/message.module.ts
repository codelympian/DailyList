import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnthropicProvider } from './anthropic.provider';
import {
  CustomerMessageController,
  MessageController,
  RecommendationMessageController,
} from './message.controller';
import { MessageService } from './message.service';

@Module({
  imports: [AuthModule],
  controllers: [MessageController, RecommendationMessageController, CustomerMessageController],
  providers: [MessageService, AnthropicProvider],
  exports: [MessageService],
})
export class MessageModule {}
