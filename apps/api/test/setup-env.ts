// Runs in every jest worker BEFORE any module is imported.
// Points the app at the dedicated test database so e2e runs never touch dev data.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://dailylist@localhost:5433/dailylist_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
