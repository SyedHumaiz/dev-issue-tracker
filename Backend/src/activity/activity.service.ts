import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireProjectMember(projectId: string, userId: string): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({ where: { userId_projectId: { userId, projectId } } });
    if (!membership) throw new ForbiddenException('You are not a member of this project');
  }

  async findByIssue(issueId: string, userId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    await this.requireProjectMember(issue.projectId, userId);

    return this.prisma.activity.findMany({
      where: { issueId },
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
