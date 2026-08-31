import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { MessageModule } from '../messages/message.module';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [AuthModule, IntelligenceModule, MessageModule],
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}
