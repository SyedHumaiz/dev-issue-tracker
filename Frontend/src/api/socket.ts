import { io, Socket } from 'socket.io-client';
import { QueryClient } from '@tanstack/react-query';
import { applyRealtimeEvent } from '@/src/api/realtimeCache';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type ConnectionListener = (connected: boolean) => void;

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private queryClient: QueryClient | null = null;
  private currentUserId: string | null = null;
  private joinedProjects = new Set<string>();
  private joinedIssues = new Set<string>();
  private listeners = new Set<ConnectionListener>();

  configure(queryClient: QueryClient, currentUserId: string | null) {
    this.queryClient = queryClient;
    this.currentUserId = currentUserId;
  }

  onConnectionChange(listener: ConnectionListener) {
    this.listeners.add(listener);
    listener(this.socket?.connected ?? false);
    return () => this.listeners.delete(listener);
  }

  private notifyConnection(connected: boolean) {
    this.listeners.forEach((listener) => listener(connected));
  }

  connect(token: string) {
    if (this.socket?.connected && this.token === token) {
      return;
    }

    this.disconnect(false);
    this.token = token;

    this.socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.notifyConnection(true);
      this.rejoinRooms();
    });

    this.socket.on('disconnect', () => {
      this.notifyConnection(false);
    });

    this.socket.on('connect_error', () => {
      this.notifyConnection(false);
    });

    this.registerEventHandlers();
  }

  disconnect(clearRooms = true) {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.token = null;
    if (clearRooms) {
      this.joinedProjects.clear();
      this.joinedIssues.clear();
    }
    this.notifyConnection(false);
  }

  joinProject(projectId: string) {
    if (!projectId || this.joinedProjects.has(projectId)) return;
    this.joinedProjects.add(projectId);
    this.socket?.emit('join:project', { projectId });
  }

  leaveProject(projectId: string) {
    if (!projectId || !this.joinedProjects.has(projectId)) return;
    this.joinedProjects.delete(projectId);
    this.socket?.emit('leave:project', { projectId });
  }

  joinIssue(issueId: string) {
    if (!issueId || this.joinedIssues.has(issueId)) return;
    this.joinedIssues.add(issueId);
    this.socket?.emit('join:issue', { issueId });
  }

  leaveIssue(issueId: string) {
    if (!issueId || !this.joinedIssues.has(issueId)) return;
    this.joinedIssues.delete(issueId);
    this.socket?.emit('leave:issue', { issueId });
  }

  private rejoinRooms() {
    this.joinedProjects.forEach((projectId) => {
      this.socket?.emit('join:project', { projectId });
    });
    this.joinedIssues.forEach((issueId) => {
      this.socket?.emit('join:issue', { issueId });
    });
  }

  private registerEventHandlers() {
    if (!this.socket) return;

    const events = [
      'issue.created',
      'issue.status_changed',
      'issue.priority_changed',
      'issue.assignee_changed',
      'comment.added',
      'project.activity_created',
      'notification.created',
    ] as const;

    events.forEach((event) => {
      this.socket?.on(event, (payload: unknown) => {
        if (!this.queryClient) return;
        applyRealtimeEvent(this.queryClient, event, payload, this.currentUserId);
      });
    });
  }
}

export const socketService = new SocketService();
