import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Integration test against the real local PostgreSQL and Redis
 * (dev stack or CI service containers). Requires DATABASE_URL/REDIS_URL.
 */
describe('GET /health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableShutdownHooks();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns ok with database and redis up', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('dailylist-api');
    expect(response.body.dependencies.database.status).toBe('up');
    expect(response.body.dependencies.redis.status).toBe('up');
    expect(typeof response.body.timestamp).toBe('string');
  });
});
