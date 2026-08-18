import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireProjectMember(projectId: string, userId: string): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({ where: { userId_projectId: { userId, projectId } } });
    if (!membership) throw new ForbiddenException('You are not a member of this project');
  }

  async findByIssue(issueId: string, userId: string, cursor?: string, limitValue?: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    await this.requireProjectMember(issue.projectId, userId);

    const limit = Math.min(Math.max(Number(limitValue) || 20, 1), 50);
    const cursorValue = this.decodeCursor(cursor);
    const items = await this.prisma.activity.findMany({
      where: { issueId, ...(cursorValue ? { OR: [{ createdAt: { lt: cursorValue.createdAt } }, { createdAt: cursorValue.createdAt, id: { lt: cursorValue.id } }] } : {}) },
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const page = items.slice(0, limit);
    const last = page.at(-1);
    return { items: page, hasMore: items.length > limit, nextCursor: items.length > limit && last ? this.encodeCursor(last.createdAt, last.id) : null };
  }

  private decodeCursor(cursor?: string) {
    if (!cursor) return undefined;
    try {
      const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
      const createdAt = new Date(value.createdAt);
      if (!value.id || Number.isNaN(createdAt.getTime())) throw new Error();
      return { id: value.id as string, createdAt };
    } catch { throw new BadRequestException('Invalid activity cursor'); }
  }

  private encodeCursor(createdAt: Date, id: string) {
    return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString('base64url');
  }
}
