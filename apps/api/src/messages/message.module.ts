import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnthropicProvider } from './anthropic.provider';
import { MessageController, RecommendationMessageController } from './message.controller';
import { MessageService } from './message.service';

@Module({
  imports: [AuthModule],
  controllers: [MessageController, RecommendationMessageController],
  providers: [MessageService, AnthropicProvider],
  exports: [MessageService],
})
export class MessageModule {}
