import * as os from 'node:os';
import { loadEnv } from './index';

describe('loadEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns a typed env when required variables are present', () => {
    process.env.DATABASE_URL = 'postgresql://dailylist@localhost:5433/dailylist_test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.API_PORT = '4100';

    const env = loadEnv();

    expect(env.DATABASE_URL).toBe('postgresql://dailylist@localhost:5433/dailylist_test');
    expect(env.API_PORT).toBe(4100);
    expect(env.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('applies defaults for optional variables', () => {
    process.env.DATABASE_URL = 'postgresql://dailylist@localhost:5433/dailylist_test';
    delete process.env.API_PORT;
    delete process.env.API_CORS_ORIGIN;

    const env = loadEnv();

    expect(env.API_PORT).toBe(4000);
    expect(env.API_CORS_ORIGIN).toBe('http://localhost:3000');
  });

  it('throws a readable error when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    // Point the .env lookup at a directory tree without a .env file.
    expect(() => loadEnv(os.tmpdir())).toThrow(/DATABASE_URL/);
  });
});
