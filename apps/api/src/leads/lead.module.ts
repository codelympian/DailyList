import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';

@Module({
  imports: [AuthModule],
  controllers: [LeadController],
  providers: [LeadService],
})
export class LeadModule {}
