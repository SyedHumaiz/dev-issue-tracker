import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GithubController } from './github.controller';
import { GithubApiService } from './github-api.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule, RealtimeModule, ProjectsModule],
  controllers: [GithubController],
  providers: [GithubApiService],
  exports: [GithubApiService],
})
export class GithubModule {}
