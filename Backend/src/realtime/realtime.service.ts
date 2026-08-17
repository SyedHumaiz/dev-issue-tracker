import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  private emitToProject(projectId: string, event: string, payload: unknown) {
    this.server?.to(`project:${projectId}`).emit(event, payload);
  }

  private emitToIssue(issueId: string, event: string, payload: unknown) {
    this.server?.to(`issue:${issueId}`).emit(event, payload);
  }

  private emitToProjectAndIssue(
    projectId: string,
    issueId: string,
    event: string,
    payload: unknown,
  ) {
    this.emitToProject(projectId, event, payload);
    this.emitToIssue(issueId, event, payload);
  }

  emitIssueCreated(issue: Record<string, unknown>) {
    const projectId = issue.projectId as string;
    const payload = {
      actorId: issue.reporterId,
      issue: { ...issue, _count: { comments: 0 } },
    };
    this.emitToProject(projectId, 'issue.created', payload);
  }

  emitIssueStatusChanged(
    projectId: string,
    issueId: string,
    actorId: string,
    issue: Record<string, unknown>,
    activity: Record<string, unknown>,
  ) {
    this.emitToProjectAndIssue(projectId, issueId, 'issue.status_changed', {
      actorId,
      issueId,
      projectId,
      status: issue.status,
      issue,
      activity,
    });
  }

  emitIssuePriorityChanged(
    projectId: string,
    issueId: string,
    actorId: string,
    issue: Record<string, unknown>,
    activity: Record<string, unknown>,
  ) {
    this.emitToProjectAndIssue(projectId, issueId, 'issue.priority_changed', {
      actorId,
      issueId,
      projectId,
      priority: issue.priority,
      issue,
      activity,
    });
  }

  emitIssueAssigneeChanged(
    projectId: string,
    issueId: string,
    actorId: string,
    issue: Record<string, unknown>,
    activity: Record<string, unknown>,
  ) {
    this.emitToProjectAndIssue(projectId, issueId, 'issue.assignee_changed', {
      actorId,
      issueId,
      projectId,
      assigneeId: issue.assigneeId,
      assignee: issue.assignee,
      issue,
      activity,
    });
  }

  emitCommentAdded(
    projectId: string,
    issueId: string,
    actorId: string,
    comment: Record<string, unknown>,
    activity: Record<string, unknown>,
  ) {
    this.emitToProjectAndIssue(projectId, issueId, 'comment.added', {
      actorId,
      issueId,
      projectId,
      comment,
      activity,
    });
  }
}
