import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ActivityType } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(issueId: string, dto: CreateCommentDto) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });
    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    const author = await this.prisma.user.findUnique({
      where: { id: dto.authorId },
    });
    if (!author) {
      throw new NotFoundException(`Author user with ID ${dto.authorId} not found`);
    }

    const comment = await this.prisma.comment.create({
      data: {
        body: dto.body,
        issueId,
        authorId: dto.authorId,
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
    await this.prisma.activity.create({
      data: {
        type: ActivityType.COMMENT_ADDED,
        issueId,
        actorId: dto.authorId,
        meta: {
          commentId: comment.id,
          snippet: dto.body.length > 50 ? dto.body.substring(0, 50) + '...' : dto.body,
        },
      },
    });

    return comment;
  }

  async findByIssue(issueId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });
    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    return this.prisma.comment.findMany({
      where: { issueId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
