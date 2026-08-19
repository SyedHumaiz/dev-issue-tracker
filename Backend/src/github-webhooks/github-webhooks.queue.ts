import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { GithubWebhookJob } from './github-webhooks.types';

export const GITHUB_WEBHOOK_QUEUE = 'github-webhooks';

@Injectable()
export class GithubWebhooksQueue implements OnModuleDestroy {
  private readonly connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
  private readonly queue = new Queue<GithubWebhookJob>(GITHUB_WEBHOOK_QUEUE, {
    connection: this.connection,
  });

  async enqueue(data: GithubWebhookJob) {
    return this.queue.add('github-webhook', data, {
      jobId: `delivery-${data.deliveryId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: { age: 86_400, count: 1_000 },
      removeOnFail: { age: 604_800, count: 5_000 },
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
  }
}
