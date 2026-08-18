import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

export interface CreateNotificationInput {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string | null;
  issueId?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(input: CreateNotificationInput) {
    if (input.actorId && input.actorId === input.recipientId) return null;

    const notification = await this.prisma.notification.create({
      data: input,
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    this.realtimeService.emitNotification(input.recipientId, notification);
    return notification;
  }

  async findAll(userId: string, cursor?: string, requestedLimit?: number) {
    const limit = Math.min(Math.max(requestedLimit || 20, 1), 50);
    const rows = await this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { recipientId: userId, isRead: false } }).then((count) => ({ count }));
  }

  async markRead(id: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true },
    });
    if (!result.count) throw new NotFoundException('Notification not found');
    return this.prisma.notification.findUnique({ where: { id } });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  }
}
