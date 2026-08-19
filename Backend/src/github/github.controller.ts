import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GithubApiService } from './github-api.service';
import { MergePullRequestDto } from './dto/merge-pull-request.dto';

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

  @Get('repos/:owner/:repo/pulls/:number')
  getPullRequest(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.githubApiService.getPullRequestDetails(user.id, owner, repo, Number(number));
  }

  @Put('repos/:owner/:repo/pulls/:number/merge')
  mergePullRequest(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string,
    @Body() dto: MergePullRequestDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.githubApiService.mergePullRequest(user.id, owner, repo, Number(number), dto.mergeMethod);
  }
}
