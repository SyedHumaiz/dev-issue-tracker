import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ActivityType } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

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
    await this.prisma.activity.create({
      data: {
        type: ActivityType.COMMENT_ADDED,
        issueId,
        actorId: authorId,
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
