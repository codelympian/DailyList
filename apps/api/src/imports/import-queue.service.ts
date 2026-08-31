import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { loadEnv } from '@dailylist/config';
import { IMPORT_QUEUE, type ImportJobPayload } from '@dailylist/importer';

/**
 * Owns the import queue AND its Redis connection.
 *
 * BullMQ only closes connections it created itself, so a connection passed
 * in must be quit explicitly — otherwise the process never exits.
 */
@Injectable()
export class ImportQueueService implements OnApplicationShutdown {
  private readonly connection: Redis;
  private readonly queue: Queue<ImportJobPayload>;

  constructor() {
    const env = loadEnv();
    this.connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.queue = new Queue<ImportJobPayload>(IMPORT_QUEUE, { connection: this.connection });
  }

  async enqueue(payload: ImportJobPayload): Promise<void> {
    await this.queue.add(payload.kind, payload);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.queue.close().catch(() => undefined);
    await this.connection.quit().catch(() => this.connection.disconnect());
  }
}
