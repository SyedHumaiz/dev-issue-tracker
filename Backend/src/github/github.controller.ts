import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GithubApiService } from './github-api.service';

@Controller('github')
@UseGuards(JwtAuthGuard)
export class GithubController {
  constructor(private readonly githubApiService: GithubApiService) {}

  @Get('repos')
  listRepos(@CurrentUser() user: { id: string }) {
    return this.githubApiService.listRepos(user.id);
  }

  @Get('repos/:owner/:repo/pulls')
  listOpenPullRequests(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.githubApiService.listOpenPullRequests(user.id, owner, repo);
  }
}
