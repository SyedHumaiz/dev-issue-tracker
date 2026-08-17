import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { RealtimeService } from './realtime.service';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
  };
}

@WebSocketGateway({ cors: true })
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtimeService.setServer(server);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new UnauthorizedException('Missing authentication token');
      }

      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid user');
      }

      client.data.userId = user.id;
      this.logger.debug(`Client connected: ${client.id} (user ${user.id})`);
    } catch (error) {
      this.logger.warn(`Rejected socket connection: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:project')
  async joinProject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { projectId?: string },
  ) {
    const projectId = body?.projectId;
    if (!projectId) {
      return { error: 'projectId is required' };
    }

    try {
      await this.requireProjectMember(projectId, client.data.userId);
      await client.join(`project:${projectId}`);
      return { joined: `project:${projectId}` };
    } catch (error) {
      return { error: this.getErrorMessage(error) };
    }
  }

  @SubscribeMessage('leave:project')
  leaveProject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { projectId?: string },
  ) {
    const projectId = body?.projectId;
    if (!projectId) {
      return { error: 'projectId is required' };
    }

    client.leave(`project:${projectId}`);
    return { left: `project:${projectId}` };
  }

  @SubscribeMessage('join:issue')
  async joinIssue(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { issueId?: string },
  ) {
    const issueId = body?.issueId;
    if (!issueId) {
      return { error: 'issueId is required' };
    }

    try {
      const issue = await this.prisma.issue.findUnique({
        where: { id: issueId },
        select: { projectId: true },
      });
      if (!issue) {
        return { error: 'Issue not found' };
      }

      await this.requireProjectMember(issue.projectId, client.data.userId);
      await client.join(`issue:${issueId}`);
      return { joined: `issue:${issueId}` };
    } catch (error) {
      return { error: this.getErrorMessage(error) };
    }
  }

  @SubscribeMessage('leave:issue')
  leaveIssue(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { issueId?: string },
  ) {
    const issueId = body?.issueId;
    if (!issueId) {
      return { error: 'issueId is required' };
    }

    client.leave(`issue:${issueId}`);
    return { left: `issue:${issueId}` };
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }

    return null;
  }

  private async requireProjectMember(projectId: string, userId: string): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this project');
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unexpected error';
  }
}
