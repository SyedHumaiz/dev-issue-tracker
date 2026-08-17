import {
  Activity,
  Comment,
  IssueDetail,
  IssueListItem,
  IssueStatus,
  Priority,
  ProjectDetail,
  ProjectIssue,
} from '@/src/types';

export interface RealtimeIssueCreatedPayload {
  actorId: string;
  issue: IssueListItem;
}

export interface RealtimeIssueChangedPayload {
  actorId: string;
  issueId: string;
  projectId: string;
  status?: IssueStatus;
  priority?: Priority;
  assigneeId?: string | null;
  assignee?: IssueListItem['assignee'];
  issue: IssueListItem | ProjectIssue;
  activity: Activity;
}

export interface RealtimeCommentAddedPayload {
  actorId: string;
  issueId: string;
  projectId: string;
  comment: Comment;
  activity: Activity;
}

export type RealtimeEventPayload =
  | RealtimeIssueCreatedPayload
  | RealtimeIssueChangedPayload
  | RealtimeCommentAddedPayload;

export type IssueSummary = IssueListItem | ProjectIssue | IssueDetail;
