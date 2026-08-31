import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './businesses/business.module';
import { CustomerModule } from './customers/customer.module';
import { HealthModule } from './health/health.module';
import { ImportModule } from './imports/import.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { LeadModule } from './leads/lead.module';
import { ProductModule } from './products/product.module';
import { RecommendationModule } from './recommendations/recommendation.module';
import { TransactionModule } from './transactions/transaction.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      // Integration tests hammer endpoints rapidly by design.
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    BusinessModule,
    CustomerModule,
    ProductModule,
    TransactionModule,
    LeadModule,
    ImportModule,
    IntelligenceModule,
    RecommendationModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
