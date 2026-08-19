import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { GithubWebhooksController } from './github-webhooks.controller';
import { GithubWebhooksProcessor } from './github-webhooks.processor';
import { GithubWebhooksQueue } from './github-webhooks.queue';

@Module({
  imports: [PrismaModule, NotificationsModule, RealtimeModule],
  controllers: [GithubWebhooksController],
  providers: [GithubWebhooksQueue, GithubWebhooksProcessor],
})
export class GithubWebhooksModule {}
