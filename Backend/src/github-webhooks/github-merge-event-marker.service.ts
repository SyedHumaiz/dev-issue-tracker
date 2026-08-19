import { Injectable, OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';

const MARKER_TTL_SECONDS = 60 * 5;
const PENDING = 'pending';
const RECORDED = 'recorded';

@Injectable()
export class GithubMergeEventMarkerService implements OnModuleDestroy {
  private readonly connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  async beginInAppMerge(repoFullName: string, pullNumber: number) {
    await this.connection.set(this.key(repoFullName, pullNumber), PENDING, 'EX', MARKER_TTL_SECONDS);
  }

  async markInAppMergeRecorded(repoFullName: string, pullNumber: number) {
    await this.connection.set(this.key(repoFullName, pullNumber), RECORDED, 'EX', MARKER_TTL_SECONDS);
  }

  async clearInAppMerge(repoFullName: string, pullNumber: number) {
    await this.connection.del(this.key(repoFullName, pullNumber));
  }

  /** Returns the marker state, consuming a completed marker exactly once. */
  async consumeCompletedInAppMerge(repoFullName: string, pullNumber: number) {
    const key = this.key(repoFullName, pullNumber);
    const state = await this.connection.get(key);
    if (state !== RECORDED) return state;
    await this.connection.del(key);
    return RECORDED;
  }

  async onModuleDestroy() {
    await this.connection.quit();
  }

  private key(repoFullName: string, pullNumber: number) {
    return `github-merge-event:${repoFullName.toLowerCase()}:${pullNumber}`;
  }
}
