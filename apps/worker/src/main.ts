import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { loadEnv } from '@dailylist/config';
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

  const worker = new Worker<HeartbeatJobData, HeartbeatResult>(
    HEARTBEAT_QUEUE,
    async (job) => processHeartbeat(job.data),
    { connection },
  );

  worker.on('completed', (job, result) => {
    console.log(`[worker] heartbeat ${job.id} completed in ${result.latencyMs}ms`);
  });
  worker.on('failed', (job, error) => {
    console.error(`[worker] job ${job?.id ?? '?'} failed: ${error.message}`);
  });

  // Enqueue one heartbeat at startup to prove the full queue round-trip.
  const queue = new Queue<HeartbeatJobData>(HEARTBEAT_QUEUE, { connection });
  await queue.add('startup-heartbeat', { requestedAt: new Date().toISOString() });

  console.log(`[worker] Dailylist worker running (queue: ${HEARTBEAT_QUEUE})`);

  const shutdown = async (): Promise<void> => {
    console.log('[worker] shutting down...');
    await worker.close();
    await queue.close();
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
