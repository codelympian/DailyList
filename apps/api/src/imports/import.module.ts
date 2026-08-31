import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImportController } from './import.controller';
import { ImportQueueService } from './import-queue.service';
import { ImportService } from './import.service';

@Module({
  imports: [AuthModule],
  controllers: [ImportController],
  providers: [ImportService, ImportQueueService],
})
export class ImportModule {}
