import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeatureRepository } from './feature.repository';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { SettingsService } from './settings.service';

@Module({
  imports: [AuthModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService, FeatureRepository, SettingsService],
  exports: [IntelligenceService, FeatureRepository, SettingsService],
})
export class IntelligenceModule {}
