import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { IssuesModule } from './issues/issues.module';
import { CommentsModule } from './comments/comments.module';
import { ActivityModule } from './activity/activity.module';
import { AuthModule } from './auth/auth.module';
import { RealtimeModule } from './realtime/realtime.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GithubModule } from './github/github.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    RealtimeModule,
    ProjectsModule,
    IssuesModule,
    CommentsModule,
    ActivityModule,
    NotificationsModule,
    GithubModule,
  ],
})
export class AppModule {}
