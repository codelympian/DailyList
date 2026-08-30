import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

/**
 * Creates a PrismaClient. Each service (api, worker) should hold exactly
 * one instance and disconnect it on shutdown.
 */
export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);
}
