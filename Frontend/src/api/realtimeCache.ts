import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/src/api/queryKeys';
import {
  RealtimeCommentAddedPayload,
  RealtimeIssueChangedPayload,
  RealtimeIssueCreatedPayload,
} from '@/src/api/realtime.types';
import {
  Activity,
  Comment,
  IssueDetail,
  IssueListItem,
  ProjectDetail,
  ProjectIssue,
  Notification,
} from '@/src/types';

function shouldSkip(actorId: string | undefined, currentUserId: string | null) {
  return !!actorId && !!currentUserId && actorId === currentUserId;
}

function upsertIssueInList(list: IssueListItem[], issue: IssueListItem) {
  const index = list.findIndex((item) => item.id === issue.id);
  if (index === -1) return [issue, ...list];
  const next = [...list];
  next[index] = { ...next[index], ...issue };
  return next;
}

function upsertProjectIssue(list: ProjectIssue[], issue: ProjectIssue) {
  const index = list.findIndex((item) => item.id === issue.id);
  if (index === -1) return [issue, ...list];
  const next = [...list];
  next[index] = { ...next[index], ...issue };
  return next;
}

function patchIssueDetail(
  current: IssueDetail | undefined,
  patch: Partial<IssueDetail>,
): IssueDetail | undefined {
  if (!current) return current;
  return { ...current, ...patch };
}

function appendUniqueActivity(activities: Activity[], activity: Activity) {
  if (activities.some((item) => item.id === activity.id)) return activities;
  return [...activities, activity];
}

function appendUniqueComment(comments: Comment[], comment: Comment) {
  if (comments.some((item) => item.id === comment.id)) return comments;
  return [...comments, comment];
}

export function patchIssueCollections(
  queryClient: QueryClient,
  projectId: string,
  issueId: string,
  patch: Partial<IssueListItem> & Partial<ProjectIssue>,
) {
  queryClient.setQueryData<IssueListItem[]>(queryKeys.issues({ projectId }), (current) => {
    if (!Array.isArray(current)) return current;
    return current.map((item) => (item.id === issueId ? { ...item, ...patch } : item));
  });

  queryClient.setQueryData<ProjectDetail>(queryKeys.project(projectId), (current) => {
    if (!current || !Array.isArray(current.issues)) return current;
    return {
      ...current,
      issues: current.issues.map((item) =>
        item.id === issueId ? { ...item, ...patch } : item,
      ),
    };
  });

  queryClient.setQueryData<IssueDetail>(queryKeys.issue(issueId), (current) =>
    patchIssueDetail(current, patch),
  );

  queryClient.getQueryCache().findAll({ queryKey: ['issues'] }).forEach((query) => {
    queryClient.setQueryData<IssueListItem[]>(query.queryKey, (current) => {
      if (!Array.isArray(current)) return current;
      const filter = query.queryKey[1] as { assigneeId?: string } | undefined;
      const index = current.findIndex((item) => item.id === issueId);
      const issue = index >= 0 ? { ...current[index], ...patch } : ({ ...patch, id: issueId } as IssueListItem);

      if (index >= 0) {
        if (filter?.assigneeId && issue.assigneeId !== filter.assigneeId) {
          return current.filter((item) => item.id !== issueId);
        }
        const next = [...current];
        next[index] = issue;
        return next;
      }

      if (filter?.assigneeId && issue.assigneeId === filter.assigneeId) {
        return upsertIssueInList(current, issue);
      }

      return current;
    });
  });
}

function handleIssueCreated(
  queryClient: QueryClient,
  payload: RealtimeIssueCreatedPayload,
  currentUserId: string | null,
) {
  if (shouldSkip(payload.actorId, currentUserId)) return;

  const issue = payload.issue;
  const projectId = issue.projectId;

  queryClient.setQueryData<IssueListItem[]>(queryKeys.issues({ projectId }), (current) =>
    Array.isArray(current) ? upsertIssueInList(current, issue) : current,
  );

  queryClient.setQueryData<ProjectDetail>(queryKeys.project(projectId), (current) => {
    if (!current || !Array.isArray(current.issues)) return current;
    const projectIssue: ProjectIssue = {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      projectId: issue.projectId,
      reporterId: issue.reporterId,
      assigneeId: issue.assigneeId,
      reporter: issue.reporter,
      assignee: issue.assignee,
    };
    return {
      ...current,
      issues: upsertProjectIssue(current.issues, projectIssue),
    };
  });

  queryClient.setQueriesData<IssueListItem[]>({ queryKey: ['issues'] }, (current) => {
    if (!Array.isArray(current)) return current;
    if (current.some((item) => item.projectId !== projectId)) return current;
    return upsertIssueInList(current, issue);
  });
}

function handleIssueChanged(
  queryClient: QueryClient,
  payload: RealtimeIssueChangedPayload,
  currentUserId: string | null,
) {
  if (shouldSkip(payload.actorId, currentUserId)) return;

  patchIssueCollections(queryClient, payload.projectId, payload.issueId, payload.issue);

  queryClient.setQueryData<IssueDetail>(queryKeys.issue(payload.issueId), (current) => {
    if (!current || !Array.isArray(current.activities)) return current;
    return {
      ...current,
      ...payload.issue,
      activities: appendUniqueActivity(current.activities, payload.activity),
    };
  });

  queryClient.setQueryData<Activity[]>(queryKeys.activity(payload.issueId), (current) => {
    if (!Array.isArray(current)) return current;
    return appendUniqueActivity(current, payload.activity);
  });
}

function handleCommentAdded(
  queryClient: QueryClient,
  payload: RealtimeCommentAddedPayload,
  currentUserId: string | null,
) {
  if (shouldSkip(payload.actorId, currentUserId)) return;

  queryClient.setQueryData<Comment[]>(queryKeys.comments(payload.issueId), (current) => {
    if (!Array.isArray(current)) return current;
    return appendUniqueComment(current, payload.comment);
  });

  queryClient.setQueryData<IssueDetail>(queryKeys.issue(payload.issueId), (current) => {
    if (!current || !Array.isArray(current.comments) || !Array.isArray(current.activities)) return current;
    return {
      ...current,
      comments: appendUniqueComment(current.comments, payload.comment),
      activities: appendUniqueActivity(current.activities, payload.activity),
    };
  });

  queryClient.setQueryData<Activity[]>(queryKeys.activity(payload.issueId), (current) => {
    if (!Array.isArray(current)) return current;
    return appendUniqueActivity(current, payload.activity);
  });

  const incrementComments = (issue: IssueListItem): IssueListItem => ({
    ...issue,
    _count: { comments: (issue._count?.comments ?? 0) + 1 },
  });

  queryClient.setQueryData<IssueListItem[]>(
    queryKeys.issues({ projectId: payload.projectId }),
    (current) => {
      if (!Array.isArray(current)) return current;
      return current.map((issue) =>
        issue.id === payload.issueId ? incrementComments(issue) : issue,
      );
    },
  );

  queryClient.setQueriesData<IssueListItem[]>({ queryKey: ['issues'] }, (current) => {
    if (!Array.isArray(current)) return current;
    return current.map((issue) =>
      issue.id === payload.issueId ? incrementComments(issue) : issue,
    );
  });
}

function handleNotificationCreated(queryClient: QueryClient, payload: Notification) {
  queryClient.setQueryData(queryKeys.notifications, (current: any) => {
    if (!current) {
      return { pages: [{ items: [payload], nextCursor: null }], pageParams: [undefined] };
    }
    const exists = current.pages.some((page: any) => page.items.some((item: Notification) => item.id === payload.id));
    if (exists) return current;
    return {
      ...current,
      pages: current.pages.map((page: any, index: number) => index === 0 ? { ...page, items: [payload, ...page.items] } : page),
    };
  });
  queryClient.setQueryData<{ count: number }>(queryKeys.unreadNotifications, (current) => ({
    count: (current?.count ?? 0) + 1,
  }));
}

export function applyRealtimeEvent(
  queryClient: QueryClient,
  event: string,
  payload: unknown,
  currentUserId: string | null,
) {
  switch (event) {
    case 'issue.created':
      handleIssueCreated(queryClient, payload as RealtimeIssueCreatedPayload, currentUserId);
      break;
    case 'issue.status_changed':
    case 'issue.priority_changed':
    case 'issue.assignee_changed':
      handleIssueChanged(queryClient, payload as RealtimeIssueChangedPayload, currentUserId);
      break;
    case 'comment.added':
      handleCommentAdded(queryClient, payload as RealtimeCommentAddedPayload, currentUserId);
      break;
    case 'notification.created':
      handleNotificationCreated(queryClient, payload as Notification);
      break;
    default:
      break;
  }
}
