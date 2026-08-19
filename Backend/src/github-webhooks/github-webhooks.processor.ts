import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ActivityType, NotificationType } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { GITHUB_WEBHOOK_QUEUE } from './github-webhooks.queue';
import { GithubPullRequestWebhookPayload, GithubWebhookJob } from './github-webhooks.types';
import { GithubMergeEventMarkerService } from './github-merge-event-marker.service';

const PROCESSED_TTL_SECONDS = 60 * 60 * 24 * 7;
const LOCK_TTL_SECONDS = 60 * 10;

@Injectable()
export class GithubWebhooksProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GithubWebhooksProcessor.name);
  private readonly connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
  private worker: Worker<GithubWebhookJob>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
    private readonly mergeEventMarker: GithubMergeEventMarkerService,
  ) {}

  onModuleInit() {
    this.worker = new Worker<GithubWebhookJob>(GITHUB_WEBHOOK_QUEUE, (job) => this.process(job), {
      connection: this.connection,
      concurrency: 5,
    });
    this.worker.on('failed', (job, error) => {
      this.logger.error(`GitHub delivery ${job?.data.deliveryId ?? 'unknown'} failed: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.connection.quit();
  }

  private async process(job: Job<GithubWebhookJob>) {
    const { deliveryId } = job.data;
    const processedKey = `github-webhook:processed:${deliveryId}`;
    const lockKey = `github-webhook:processing:${deliveryId}`;

    if (await this.connection.get(processedKey)) {
      this.logger.debug(`Skipping duplicate GitHub delivery ${deliveryId}`);
      return;
    }

    const locked = await this.connection.set(lockKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
    if (!locked) {
      this.logger.debug(`GitHub delivery ${deliveryId} is already being processed`);
      return;
    }

    try {
      if (job.data.event !== 'pull_request') {
        await this.connection.set(processedKey, '1', 'EX', PROCESSED_TTL_SECONDS);
        return;
      }
      const payload = this.parsePayload(job.data.rawPayload);
      await this.handlePullRequest(payload);
      await this.connection.set(processedKey, '1', 'EX', PROCESSED_TTL_SECONDS);
    } finally {
      await this.connection.del(lockKey);
    }
  }

  private parsePayload(rawPayload: string): GithubPullRequestWebhookPayload {
    try {
      return JSON.parse(rawPayload) as GithubPullRequestWebhookPayload;
    } catch {
      throw new Error('GitHub webhook payload is not valid JSON');
    }
  }

  private async handlePullRequest(payload: GithubPullRequestWebhookPayload) {
    const repoFullName = payload.repository?.full_name?.trim();
    const pullRequest = payload.pull_request;
    const number = pullRequest?.number;
    const title = pullRequest?.title?.trim();
    const url = pullRequest?.html_url;
    const author = pullRequest?.user?.login;
    if (!repoFullName || !number || !title || !url || !author) {
      throw new Error('GitHub pull_request webhook is missing required data');
    }

    const isMergedClosure = payload.action === 'closed' && pullRequest?.merged === true;
    if (isMergedClosure) {
      const markerState = await this.mergeEventMarker.consumeCompletedInAppMerge(repoFullName, number);
      if (markerState === 'recorded') {
        this.logger.debug(`Skipping in-app merge webhook for ${repoFullName} PR #${number}`);
        return;
      }
      if (markerState === 'pending') {
        // The endpoint has successfully reached GitHub but has not yet
        // committed its local activity. Retrying avoids an ordering race.
        throw new Error(`In-app merge activity is still being recorded for PR #${number}`);
      }
    }

    const actionDetails = this.getActionDetails(isMergedClosure ? 'merged' : payload.action);
    if (!actionDetails) return;

    const project = await this.prisma.project.findFirst({
      where: { githubRepoFullName: { equals: repoFullName, mode: 'insensitive' } },
      include: {
        members: {
          include: { user: { select: { id: true, githubUsername: true } } },
        },
      },
    });
    if (!project) {
      this.logger.log(`No project is linked to GitHub repository ${repoFullName}; skipping PR #${number}`);
      return;
    }

    // GitHub identifies the PR author in pull_request.user, but a closed PR
    // can be closed/merged by somebody else. Use that sender as the actor so
    // the merger is not notified by the follow-up closed webhook either.
    const actorUsername = payload.action === 'closed' ? payload.sender?.login ?? author : author;
    const actor = await this.prisma.user.findFirst({
      where: { githubUsername: { equals: actorUsername, mode: 'insensitive' } },
      select: { id: true },
    });
    const requestedReviewer = payload.requested_reviewer?.login;
    const activity = await this.prisma.activity.create({
      data: {
        type: actionDetails.activityType,
        projectId: project.id,
        actorId: actor?.id ?? null,
        meta: {
          prNumber: number,
          prTitle: title,
          author,
          url,
          repositoryFullName: repoFullName,
          requestedReviewer: requestedReviewer ?? null,
        },
      },
      include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
    });

    const candidateRecipients = payload.action === 'review_requested'
      ? project.members
          .filter((member) => member.user.githubUsername?.toLowerCase() === requestedReviewer?.toLowerCase())
          .map((member) => member.userId)
      : project.members.map((member) => member.userId);

    // A mapped GitHub author is the notification actor. Do not notify that
    // person about their own PR, but retain every other ProjectMember,
    // including members with the OWNER role.
    const recipients = [...new Set(candidateRecipients)].filter(
      (recipientId) => recipientId !== actor?.id,
    );

    if (payload.action === 'review_requested' && !candidateRecipients.length) {
      this.logger.log(`Requested reviewer ${requestedReviewer ?? 'unknown'} is not a mapped project member; no notification sent`);
    }

    await Promise.all(
      recipients.map((recipientId) =>
        this.notificationsService.create({
          recipientId,
          actorId: actor?.id ?? null,
          type: actionDetails.notificationType,
          title: actionDetails.notificationTitle,
          message: actionDetails.message(number, title, author),
          projectId: project.id,
        }),
      ),
    );
    this.realtimeService.emitProjectActivityCreated(project.id, activity);
  }

  private getActionDetails(action: string) {
    const common = {
      opened: {
        activityType: ActivityType.GITHUB_PR_OPENED,
        notificationType: NotificationType.GITHUB_PR_OPENED,
        notificationTitle: 'Pull request opened',
        message: (number: number, title: string, author: string) => `PR #${number} '${title}' opened on GitHub by ${author}.`,
      },
      closed: {
        activityType: ActivityType.GITHUB_PR_CLOSED,
        notificationType: NotificationType.GITHUB_PR_CLOSED,
        notificationTitle: 'Pull request closed',
        message: (number: number, title: string, author: string) => `PR #${number} '${title}' closed on GitHub by ${author}.`,
      },
      reopened: {
        activityType: ActivityType.GITHUB_PR_REOPENED,
        notificationType: NotificationType.GITHUB_PR_REOPENED,
        notificationTitle: 'Pull request reopened',
        message: (number: number, title: string, author: string) => `PR #${number} '${title}' reopened on GitHub by ${author}.`,
      },
      review_requested: {
        activityType: ActivityType.GITHUB_PR_REVIEW_REQUESTED,
        notificationType: NotificationType.GITHUB_PR_REVIEW_REQUESTED,
        notificationTitle: 'Review requested',
        message: (number: number, title: string, author: string) => `Your review was requested for PR #${number} '${title}' by ${author}.`,
      },
      merged: {
        activityType: ActivityType.GITHUB_PR_MERGED,
        notificationType: NotificationType.GITHUB_PR_MERGED,
        notificationTitle: 'Pull request merged',
        message: (number: number, title: string) => `PR #${number} '${title}' was merged on GitHub.`,
      },
    } as const;
    return common[action as keyof typeof common];
  }
}
