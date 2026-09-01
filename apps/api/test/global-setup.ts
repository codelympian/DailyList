import { execSync } from 'node:child_process';
import * as path from 'node:path';

/**
 * Runs once before the e2e suite: applies migrations to the test database
 * and truncates Phase 1 tables so runs are deterministic.
 */
export default async function globalSetup(): Promise<void> {
  // Local PostgreSQL only — never DATABASE_URL, which now points at Supabase.
  const databaseUrl =
    process.env.TEST_DATABASE_URL ?? 'postgresql://dailylist@localhost:5433/dailylist_test';

  const databasePackage = path.resolve(__dirname, '../../../packages/database');
  execSync('npx prisma migrate deploy', {
    cwd: databasePackage,
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    stdio: 'inherit',
  });

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE messages, message_templates, daily_recommendations, communication_preferences, business_settings, import_rows, import_jobs, leads, payments, transaction_items, transactions, products, customer_events, customer_identities, customers, business_memberships, businesses, users CASCADE',
    );
  } finally {
    await prisma.$disconnect();
  }
}
