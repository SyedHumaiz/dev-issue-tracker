import { BadGatewayException, BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class GithubApiService {
  private readonly baseUrl = 'https://api.github.com';

  constructor(private readonly prisma: PrismaService) {}

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

  private async getAccessToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true },
    });
    if (!user?.githubAccessToken) throw new BadRequestException('GitHub not connected');
    return user.githubAccessToken;
  }

  private async request<T>(path: string, accessToken: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'dev-issue-tracker',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
    } catch {
      throw new ServiceUnavailableException('Unable to reach GitHub. Please try again shortly.');
    }

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
}
