import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { FilterIssueDto } from './dto/filter-issue.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { UpdateAssigneeDto } from './dto/update-assignee.dto';
import { ActivityType, NotificationType } from '@prisma/client';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class IssuesService {
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

  private async notifyIssueRecipients(
    issue: { id: string; projectId: string; title: string; reporterId: string; assigneeId: string | null },
    actorId: string,
    type: NotificationType,
    title: string,
    message: string,
    recipients: string[],
  ) {
    await Promise.all(
      [...new Set(recipients)]
        .filter((recipientId) => recipientId !== actorId)
        .map((recipientId) => this.notificationsService.create({
          recipientId,
          actorId,
          type,
          title,
          message,
          projectId: issue.projectId,
          issueId: issue.id,
        })),
    );
  }

  async create(dto: CreateIssueDto, reporterId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterId },
    });
    if (!reporter) {
      throw new NotFoundException(`Reporter user with ID ${reporterId} not found`);
    }

    await this.requireProjectMember(dto.projectId, reporterId);

    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assigneeId },
      });
      if (!assignee) {
        throw new NotFoundException(`Assignee user with ID ${dto.assigneeId} not found`);
      }
    }

    const issue = await this.prisma.issue.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        projectId: dto.projectId,
        reporterId,
        assigneeId: dto.assigneeId,
      },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Record ISSUE_CREATED activity
    await this.prisma.activity.create({
      data: {
        type: ActivityType.ISSUE_CREATED,
        issueId: issue.id,
        actorId: reporterId,
        meta: {
          title: issue.title,
          status: issue.status,
          priority: issue.priority,
        },
      },
    });

    this.realtimeService.emitIssueCreated(issue);

    return issue;
  }

  async findAll(filter: FilterIssueDto, userId: string) {
    if (filter.projectId) {
      await this.requireProjectMember(filter.projectId, userId);
    }
    const where: any = { project: { members: { some: { userId } } } };
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.assigneeId) where.assigneeId = filter.assigneeId;
    if (filter.reporterId) where.reporterId = filter.reporterId;

    return this.prisma.issue.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${id} not found`);
    }

    await this.requireProjectMember(issue.projectId, userId);

    return issue;
  }

  async update(id: string, dto: UpdateIssueDto, actorId: string) {
    const existing = await this.findOne(id, actorId);

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
    });
    if (!actor) {
      throw new NotFoundException(`Actor user with ID ${actorId} not found`);
    }

    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assigneeId },
      });
      if (!assignee) {
        throw new NotFoundException(`Assignee user with ID ${dto.assigneeId} not found`);
      }
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.assigneeId !== undefined) updateData.assigneeId = dto.assigneeId;

    const updatedIssue = await this.prisma.issue.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const actorSelect = { select: { id: true, name: true, avatarUrl: true } };

    // Record activity only when value actually changes
    if (dto.status !== undefined && dto.status !== existing.status) {
      const activity = await this.prisma.activity.create({
        data: {
          type: ActivityType.STATUS_CHANGED,
          issueId: id,
          actorId,
          meta: { before: existing.status, after: dto.status },
        },
        include: { actor: actorSelect },
      });
      this.realtimeService.emitIssueStatusChanged(
        existing.projectId,
        id,
        actorId,
        updatedIssue,
        activity,
      );
      await this.notifyIssueRecipients(updatedIssue, actorId, NotificationType.STATUS_CHANGED, 'Issue status changed', `${updatedIssue.title} is now ${updatedIssue.status.replace('_', ' ').toLowerCase()}.`, [updatedIssue.reporterId, updatedIssue.assigneeId].filter(Boolean) as string[]);
    }

    if (dto.priority !== undefined && dto.priority !== existing.priority) {
      const activity = await this.prisma.activity.create({
        data: {
          type: ActivityType.PRIORITY_CHANGED,
          issueId: id,
          actorId,
          meta: { before: existing.priority, after: dto.priority },
        },
        include: { actor: actorSelect },
      });
      this.realtimeService.emitIssuePriorityChanged(
        existing.projectId,
        id,
        actorId,
        updatedIssue,
        activity,
      );
      await this.notifyIssueRecipients(updatedIssue, actorId, NotificationType.PRIORITY_CHANGED, 'Issue priority changed', `${updatedIssue.title} is now ${updatedIssue.priority.toLowerCase()} priority.`, [updatedIssue.reporterId, updatedIssue.assigneeId].filter(Boolean) as string[]);
    }

    if (dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId) {
      const activity = await this.prisma.activity.create({
        data: {
          type: ActivityType.ASSIGNEE_CHANGED,
          issueId: id,
          actorId,
          meta: {
            before: existing.assigneeId,
            after: dto.assigneeId,
            beforeName: existing.assignee?.name ?? null,
            afterName: updatedIssue.assignee?.name ?? null,
          },
        },
        include: { actor: actorSelect },
      });
      this.realtimeService.emitIssueAssigneeChanged(
        existing.projectId,
        id,
        actorId,
        updatedIssue,
        activity,
      );
      if (updatedIssue.assigneeId) {
        await this.notifyIssueRecipients(updatedIssue, actorId, NotificationType.ISSUE_ASSIGNED, 'Issue assigned to you', `${updatedIssue.title} was assigned to you.`, [updatedIssue.assigneeId]);
      }
    }

    return updatedIssue;
  }

  async updateStatus(id: string, dto: UpdateStatusDto, actorId: string) {
    return this.update(id, dto, actorId);
  }

  async updatePriority(id: string, dto: UpdatePriorityDto, actorId: string) {
    return this.update(id, dto, actorId);
  }

  async updateAssignee(id: string, dto: UpdateAssigneeDto, actorId: string) {
    return this.update(id, dto, actorId);
  }
}
