import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { loadEnv } from '@dailylist/config';
import { createPrismaClient } from '@dailylist/database';
import {
  executeImportJob,
  IMPORT_QUEUE,
  validateImportJob,
  type ImportJobPayload,
} from '@dailylist/importer';
import {
  HEARTBEAT_QUEUE,
  processHeartbeat,
  type HeartbeatJobData,
  type HeartbeatResult,
} from './heartbeat';

async function main(): Promise<void> {
  const env = loadEnv();

  // BullMQ requires maxRetriesPerRequest: null on blocking connections.
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const prisma = createPrismaClient(env.DATABASE_URL);

  const heartbeatWorker = new Worker<HeartbeatJobData, HeartbeatResult>(
    HEARTBEAT_QUEUE,
    async (job) => processHeartbeat(job.data),
    { connection },
  );
  heartbeatWorker.on('completed', (job, result) => {
    console.log(`[worker] heartbeat ${job.id} completed in ${result.latencyMs}ms`);
  });

  // Large imports (> INLINE_ROW_LIMIT rows) are processed here so they
  // never block interactive API requests.
  const importWorker = new Worker<ImportJobPayload>(
    IMPORT_QUEUE,
    async (job) => {
      const { kind, importJobId } = job.data;
      console.log(`[worker] import ${kind} started for job ${importJobId}`);
      if (kind === 'validate') await validateImportJob(prisma, importJobId);
      else await executeImportJob(prisma, importJobId);
    },
    { connection, concurrency: 1 },
  );
  importWorker.on('completed', (job) => {
    console.log(`[worker] import ${job.data.kind} completed for job ${job.data.importJobId}`);
  });
  for (const worker of [heartbeatWorker, importWorker]) {
    worker.on('failed', (job, error) => {
      console.error(`[worker] job ${job?.id ?? '?'} failed: ${error.message}`);
    });
  }

  // Enqueue one heartbeat at startup to prove the full queue round-trip.
  const queue = new Queue<HeartbeatJobData>(HEARTBEAT_QUEUE, { connection });
  await queue.add('startup-heartbeat', { requestedAt: new Date().toISOString() });

  console.log(`[worker] Dailylist worker running (queues: ${HEARTBEAT_QUEUE}, ${IMPORT_QUEUE})`);

  const shutdown = async (): Promise<void> => {
    console.log('[worker] shutting down...');
    await heartbeatWorker.close();
    await importWorker.close();
    await queue.close();
    await prisma.$disconnect().catch(() => undefined);
    await connection.quit().catch(() => connection.disconnect());
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((error) => {
  console.error('[worker] fatal:', error);
  process.exit(1);
});
