import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { IssueStatus, NotificationType, Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
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

  // Throws 403 if the user is not an OWNER of the project
  private async requireOwner(projectId: string, actorId: string): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: actorId, projectId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this project');
    }
    if (membership.role !== Role.OWNER) {
      throw new ForbiddenException('Only project owners can perform this action');
    }
  }

  async create(dto: CreateProjectDto, ownerId: string) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
      },
    });

    // The authenticated user automatically becomes OWNER
    await this.prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: ownerId,
        role: Role.OWNER,
      },
    });

    return this.findOne(project.id, ownerId);
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { isArchived: false, members: { some: { userId } } },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            issues: true,
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        issues: {
          include: {
            reporter: {
              select: { id: true, name: true, avatarUrl: true },
            },
            assignee: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    await this.requireProjectMember(id, userId);

    return project;
  }

  async getStats(projectId: string, userId: string) {
    await this.requireProjectMember(projectId, userId);
    const counts = await this.prisma.issue.groupBy({
      by: ['status'],
      where: { projectId },
      _count: { _all: true },
    });
    const byStatus = new Map(counts.map((count) => [count.status, count._count._all]));
    const open = byStatus.get(IssueStatus.OPEN) ?? 0;
    const inReview = byStatus.get(IssueStatus.IN_REVIEW) ?? 0;
    const closed = byStatus.get(IssueStatus.CLOSED) ?? 0;
    return { total: open + inReview + closed, open, inReview, closed };
  }

  async update(id: string, dto: UpdateProjectDto, actorId: string) {
    await this.requireOwner(id, actorId);
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException(`Project with ID ${id} not found`);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isArchived !== undefined ? { isArchived: dto.isArchived } : {}),
      },
    });
  }

  async addMember(projectId: string, dto: AddMemberDto, actorId: string) {
    const project = await this.findOne(projectId, actorId);

    // Only OWNERs can add members
    await this.requireOwner(projectId, actorId);

    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: dto.userId,
          projectId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this project');
    }

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        role: dto.role || Role.MEMBER,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
    await this.notificationsService.create({
      recipientId: dto.userId,
      actorId,
      type: NotificationType.PROJECT_INVITED,
      title: 'Added to a project',
      message: `You were added to ${project.name}.`,
      projectId,
    });
    return member;
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    dto: UpdateMemberRoleDto,
    actorId: string,
  ) {
    await this.findOne(projectId, actorId);

    // Only OWNERs can change member roles
    await this.requireOwner(projectId, actorId);

    const member = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in project');
    }

    if (member.role === Role.OWNER && dto.role === Role.MEMBER) {
      const ownerCount = await this.prisma.projectMember.count({ where: { projectId, role: Role.OWNER } });
      if (ownerCount === 1) throw new ForbiddenException('A project must have at least one owner');
    }

    return this.prisma.projectMember.update({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      data: { role: dto.role },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
    });
  }

  async removeMember(projectId: string, userId: string, actorId: string) {
    await this.findOne(projectId, actorId);

    // Only OWNERs can remove members
    await this.requireOwner(projectId, actorId);

    const member = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in project');
    }

    if (member.role === Role.OWNER) {
      const ownerCount = await this.prisma.projectMember.count({ where: { projectId, role: Role.OWNER } });
      if (ownerCount === 1) throw new ForbiddenException('A project must have at least one owner');
    }

    return this.prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });
  }
}
