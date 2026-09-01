// Runs in every jest worker BEFORE any module is imported.
//
// The test database is the LOCAL PostgreSQL, never whatever DATABASE_URL
// happens to point at. That used to fall back to DATABASE_URL, which now
// means Supabase — and since the suite truncates every table, a missing
// TEST_DATABASE_URL would have wiped the development database.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://dailylist@localhost:5433/dailylist_test';
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Supabase values the guard needs. The JWKS URL is replaced at runtime by the
// local harness (test/auth-harness.ts), which serves a key set the suite signs
// tokens with — so verification is exercised for real, offline.
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? 'test-secret-key';
