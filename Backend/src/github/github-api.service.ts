import { BadGatewayException, BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ActivityType, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ProjectsService } from '../projects/projects.service';
import { MergeMethod } from './dto/merge-pull-request.dto';

interface GithubApiError {
  message?: string;
}

interface GithubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  updated_at: string;
}

interface GithubPullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  user: { login: string; avatar_url: string };
  html_url: string;
  created_at: string;
  updated_at: string;
}

interface GithubPullRequestDetail extends GithubPullRequest {
  mergeable: boolean | null;
  mergeable_state: string;
  merged: boolean;
  base: { ref: string };
  head: { sha: string };
}

interface GithubMergeResult {
  sha: string;
  merged: boolean;
  message: string;
}

@Injectable()
export class GithubApiService {
  private readonly baseUrl = 'https://api.github.com';
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
    private readonly projectsService: ProjectsService,
  ) {}

  async listRepos(userId: string) {
    const token = await this.getAccessToken(userId);
    const repos = await this.request<GithubRepository[]>('/user/repos?sort=updated&per_page=50', token);
    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      updatedAt: repo.updated_at,
    }));
  }

  async listOpenPullRequests(userId: string, owner: string, repo: string) {
    const token = await this.getAccessToken(userId);
    const pulls = await this.request<GithubPullRequest[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open`,
      token,
    );
    return pulls.map((pull) => ({
      id: pull.id,
      number: pull.number,
      title: pull.title,
      state: pull.state,
      author: { login: pull.user.login, avatarUrl: pull.user.avatar_url },
      htmlUrl: pull.html_url,
      createdAt: pull.created_at,
      updatedAt: pull.updated_at,
    }));
  }

  async getPullRequestDetails(userId: string, owner: string, repo: string, number: number) {
    this.ensureValidPullNumber(number);
    const token = await this.getAccessToken(userId);
    const pull = await this.fetchPullRequest(owner, repo, number, token);
    return this.toPullRequestDetail(pull);
  }

  async mergePullRequest(
    userId: string,
    owner: string,
    repo: string,
    number: number,
    mergeMethod: MergeMethod = 'merge',
  ) {
    this.ensureValidPullNumber(number);
    const token = await this.getAccessToken(userId);
    const project = await this.findLinkedProject(owner, repo);
    await this.projectsService.requireOwner(project.id, userId, 'merge pull requests');
    const pull = await this.fetchPullRequest(owner, repo, number, token);
    this.ensureMergeable(pull);

    const response = await this.githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}/merge`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify({ merge_method: mergeMethod, sha: pull.head.sha }),
      },
    );
    const result = await response.json().catch(() => ({})) as GithubMergeResult & GithubApiError;
    if (!response.ok) this.throwMergeError(response.status, result.message);
    if (!result.merged) {
      throw new ConflictException(result.message || 'GitHub could not merge this pull request. Refresh it and try again.');
    }

    await this.recordMergeActivity(project, {
      userId,
      repoFullName: `${owner}/${repo}`,
      number,
      title: pull.title,
      author: pull.user.login,
      url: pull.html_url,
      mergeMethod,
    });

    return { merged: true, sha: result.sha, message: result.message || 'Pull request merged successfully.' };
  }

  private async fetchPullRequest(owner: string, repo: string, number: number, token: string) {
    return this.request<GithubPullRequestDetail>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`,
      token,
    );
  }

  private toPullRequestDetail(pull: GithubPullRequestDetail) {
    return {
      ...this.toPullRequest(pull),
      mergeable: pull.mergeable,
      mergeableState: pull.mergeable_state,
      merged: pull.merged,
      baseBranch: pull.base.ref,
    };
  }

  private toPullRequest(pull: GithubPullRequest) {
    return {
      id: pull.id,
      number: pull.number,
      title: pull.title,
      state: pull.state,
      author: { login: pull.user.login, avatarUrl: pull.user.avatar_url },
      htmlUrl: pull.html_url,
      createdAt: pull.created_at,
      updatedAt: pull.updated_at,
    };
  }

  private ensureValidPullNumber(number: number) {
    if (!Number.isSafeInteger(number) || number < 1) {
      throw new BadRequestException('Pull request number must be a positive integer');
    }
  }

  private ensureMergeable(pull: GithubPullRequestDetail) {
    if (pull.merged) throw new ConflictException('This pull request has already been merged.');
    if (pull.mergeable === false || pull.mergeable_state === 'dirty') {
      throw new ConflictException('This PR has conflicts and cannot be merged.');
    }
    if (pull.mergeable !== true || pull.mergeable_state !== 'clean') {
      throw new ConflictException('This PR is not ready to merge yet. Checks may still be pending.');
    }
  }

  private async findLinkedProject(owner: string, repo: string) {
    const repoFullName = `${owner}/${repo}`;
    const project = await this.prisma.project.findFirst({
      where: { githubRepoFullName: { equals: repoFullName, mode: 'insensitive' } },
      include: { members: { select: { userId: true } } },
    });
    if (!project) {
      throw new ForbiddenException('This repository is not linked to a project you can merge from.');
    }
    return project;
  }

  private async recordMergeActivity(project: { id: string; members: { userId: string }[] }, input: {
    userId: string;
    repoFullName: string;
    number: number;
    title: string;
    author: string;
    url: string;
    mergeMethod: MergeMethod;
  }) {
    const activity = await this.prisma.activity.create({
      data: {
        type: ActivityType.GITHUB_PR_MERGED,
        projectId: project.id,
        actorId: input.userId,
        meta: {
          prNumber: input.number,
          prTitle: input.title,
          author: input.author,
          url: input.url,
          repositoryFullName: input.repoFullName,
          mergeMethod: input.mergeMethod,
        },
      },
      include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await Promise.all(
      project.members
        .map((member) => member.userId)
        .filter((recipientId) => recipientId !== input.userId)
        .map((recipientId) => this.notificationsService.create({
          recipientId,
          actorId: input.userId,
          type: NotificationType.GITHUB_PR_MERGED,
          title: 'Pull request merged',
          message: `PR #${input.number} '${input.title}' was merged on GitHub.`,
          projectId: project.id,
        })),
    );
    this.realtimeService.emitProjectActivityCreated(project.id, activity);
  }

  private async getAccessToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true },
    });
    if (!user?.githubAccessToken) throw new BadRequestException('GitHub not connected');
    return user.githubAccessToken;
  }

  private async request<T>(path: string, accessToken: string): Promise<T> {
    const response = await this.githubFetch(path, accessToken);

    if (response.ok) return response.json() as Promise<T>;

    const error = await response.json().catch(() => ({})) as GithubApiError;
    if (response.status === 401) {
      throw new ForbiddenException('GitHub token is invalid or expired. Please reconnect GitHub.');
    }
    if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
      throw new HttpException('GitHub API rate limit reached. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (response.status === 403) {
      throw new ForbiddenException(error.message || 'GitHub denied access to this resource.');
    }
    throw new BadGatewayException(error.message || 'GitHub could not complete this request.');
  }

  private async githubFetch(path: string, accessToken: string, init?: RequestInit) {
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'dev-issue-tracker',
          'X-GitHub-Api-Version': '2022-11-28',
          ...init?.headers,
        },
      });
    } catch {
      throw new ServiceUnavailableException('Unable to reach GitHub. Please try again shortly.');
    }
  }

  private throwMergeError(status: number, message?: string) {
    if (status === 401) {
      throw new UnauthorizedException('GitHub token is invalid or expired. Please reconnect GitHub.');
    }
    if (status === 403) {
      throw new ForbiddenException("Your connected GitHub account doesn't have permission to merge on this repository.");
    }
    if (status === 405) {
      throw new ConflictException('This PR is not mergeable with the selected merge method.');
    }
    if (status === 409) {
      throw new ConflictException('This PR changed or has conflicts. Refresh it and try again.');
    }
    throw new BadGatewayException(message || 'GitHub could not merge this pull request.');
  }
}
