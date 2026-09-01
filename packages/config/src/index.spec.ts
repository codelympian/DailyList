import * as os from 'node:os';
import { loadEnv } from './index';

describe('loadEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Supabase auth config is required; each case sets it unless it is
    // specifically testing what happens when something is missing.
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
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
    delete process.env.AI_MESSAGES_ENABLED;
    delete process.env.AI_MESSAGE_MODEL;

    // Load from a directory with no .env, so this asserts the schema's own
    // defaults rather than whatever the developer's local .env happens to say.
    const env = loadEnv(os.tmpdir());

    expect(env.API_PORT).toBe(4000);
    expect(env.API_CORS_ORIGIN).toBe('http://localhost:3000');
  });

  it('defaults AI message generation to disabled', () => {
    process.env.DATABASE_URL = 'postgresql://dailylist@localhost:5433/dailylist_test';
    delete process.env.AI_MESSAGES_ENABLED;
    delete process.env.ANTHROPIC_API_KEY;

    const env = loadEnv(os.tmpdir());

    expect(env.AI_MESSAGES_ENABLED).toBe(false);
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.AI_MESSAGE_MODEL).toBe('claude-opus-5');
  });

  it('enables AI only when explicitly set to "true"', () => {
    process.env.DATABASE_URL = 'postgresql://dailylist@localhost:5433/dailylist_test';
    process.env.AI_MESSAGES_ENABLED = 'true';

    expect(loadEnv(os.tmpdir()).AI_MESSAGES_ENABLED).toBe(true);
  });

  it('throws a readable error when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    // Point the .env lookup at a directory tree without a .env file.
    expect(() => loadEnv(os.tmpdir())).toThrow(/DATABASE_URL/);
  });
});
