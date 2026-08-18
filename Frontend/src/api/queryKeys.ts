import type { IssueFilter } from '@/src/types';

export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  projectStats: (id: string) => ['projects', id, 'stats'] as const,
  issues: (filter?: IssueFilter) => ['issues', filter] as const,
  issue: (id: string) => ['issues', id] as const,
  comments: (issueId: string) => ['comments', issueId] as const,
  activity: (issueId: string) => ['activity', issueId] as const,
  notifications: ['notifications'] as const,
  unreadNotifications: ['notifications', 'unread-count'] as const,
};
