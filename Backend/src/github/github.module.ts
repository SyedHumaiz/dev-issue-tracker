import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GithubController } from './github.controller';
import { GithubApiService } from './github-api.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [GithubController],
  providers: [GithubApiService],
  exports: [GithubApiService],
})
export class GithubModule {}
