import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import type { DependencyHealth, HealthReport } from '@dailylist/types';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

const SERVICE_NAME = 'dailylist-api';
const SERVICE_VERSION = '0.1.0';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async check(): Promise<HealthReport> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    const healthy = database.status === 'up' && redis.status === 'up';

    return {
      status: healthy ? 'ok' : 'degraded',
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      timestamp: new Date().toISOString(),
      dependencies: { database, redis },
    };
  }

  private async checkDatabase(): Promise<DependencyHealth> {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - started };
    } catch (error) {
      return { status: 'down', error: toSafeMessage(error) };
    }
  }

  private async checkRedis(): Promise<DependencyHealth> {
    const started = Date.now();
    try {
      await this.redis.ping();
      return { status: 'up', latencyMs: Date.now() - started };
    } catch (error) {
      return { status: 'down', error: toSafeMessage(error) };
    }
  }
}

function toSafeMessage(error: unknown): string {
  // Dependency errors can contain connection strings; expose only the class/short message.
  if (error instanceof Error) return error.name;
  return 'UnknownError';
}
