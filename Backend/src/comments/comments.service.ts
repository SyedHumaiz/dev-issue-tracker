import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ActivityType, NotificationType } from '@prisma/client';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async requireProjectMember(projectId: string, userId: string): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this project');
    }
  }

  async create(issueId: string, dto: CreateCommentDto, authorId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });
    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
    });
    if (!author) {
      throw new NotFoundException(`Author user with ID ${authorId} not found`);
    }

    await this.requireProjectMember(issue.projectId, authorId);

    const comment = await this.prisma.comment.create({

      data: {
        body: dto.body,
        issueId,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Auto-generate Activity record for added comment
    const activity = await this.prisma.activity.create({
      data: {
        type: ActivityType.COMMENT_ADDED,
        issueId,
        actorId: authorId,
        meta: {
          commentId: comment.id,
          snippet: dto.body.length > 50 ? dto.body.substring(0, 50) + '...' : dto.body,
        },
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    this.realtimeService.emitCommentAdded(
      issue.projectId,
      issueId,
      authorId,
      comment,
      activity,
    );

    const recipients = [issue.reporterId, issue.assigneeId].filter(
      (recipientId): recipientId is string => !!recipientId && recipientId !== authorId,
    );
    await Promise.all(
      [...new Set(recipients)].map((recipientId) => this.notificationsService.create({
        recipientId,
        actorId: authorId,
        type: NotificationType.COMMENT_ADDED,
        title: 'New comment',
        message: `${author.name} commented on ${issue.title}.`,
        projectId: issue.projectId,
        issueId,
      })),
    );

    return comment;
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
    const items = await this.prisma.comment.findMany({
      where: { issueId, ...(cursorValue ? { OR: [{ createdAt: { lt: cursorValue.createdAt } }, { createdAt: cursorValue.createdAt, id: { lt: cursorValue.id } }] } : {}) },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
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
    } catch { throw new BadRequestException('Invalid comments cursor'); }
  }

  private encodeCursor(createdAt: Date, id: string) {
    return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString('base64url');
  }
}
