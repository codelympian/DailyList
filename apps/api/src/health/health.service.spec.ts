import { HealthService } from './health.service';
import type { PrismaService } from '../prisma/prisma.service';
import type Redis from 'ioredis';

function buildService(overrides?: { dbFails?: boolean; redisFails?: boolean }): HealthService {
  const prisma = {
    $queryRaw: overrides?.dbFails
      ? jest.fn().mockRejectedValue(new Error('db down'))
      : jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  } as unknown as PrismaService;

  const redis = {
    ping: overrides?.redisFails
      ? jest.fn().mockRejectedValue(new Error('redis down'))
      : jest.fn().mockResolvedValue('PONG'),
  } as unknown as Redis;

  return new HealthService(prisma, redis);
}

describe('HealthService', () => {
  it('reports ok when database and redis are up', async () => {
    const report = await buildService().check();

    expect(report.status).toBe('ok');
    expect(report.service).toBe('dailylist-api');
    expect(report.dependencies.database.status).toBe('up');
    expect(report.dependencies.redis.status).toBe('up');
  });

  it('reports degraded when the database is down', async () => {
    const report = await buildService({ dbFails: true }).check();

    expect(report.status).toBe('degraded');
    expect(report.dependencies.database.status).toBe('down');
    expect(report.dependencies.redis.status).toBe('up');
  });

  it('reports degraded when redis is down', async () => {
    const report = await buildService({ redisFails: true }).check();

    expect(report.status).toBe('degraded');
    expect(report.dependencies.redis.status).toBe('down');
  });

  it('does not leak raw error details (e.g. connection strings)', async () => {
    const report = await buildService({ dbFails: true }).check();

    expect(report.dependencies.database.error).toBe('Error');
    expect(JSON.stringify(report)).not.toContain('db down');
  });
});
