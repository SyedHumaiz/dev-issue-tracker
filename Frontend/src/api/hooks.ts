import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { projectsApi, issuesApi, commentsApi, activityApi, usersApi, notificationsApi, authApi, githubApi } from '@/src/api/endpoints';
import {
  CreateProjectRequest,
  AddMemberRequest,
  UpdateMemberRoleRequest,
  CreateIssueRequest,
  UpdateStatusRequest,
  UpdatePriorityRequest,
  UpdateAssigneeRequest,
  CreateCommentRequest,
  IssueFilter,
  UpdateProfileRequest,
  UpdateProjectRequest,
} from '@/src/types';
import { useAuthStore } from '@/src/store/useAuthStore';
import { queryKeys } from '@/src/api/queryKeys';
import { patchIssueCollections } from '@/src/api/realtimeCache';

// ── Query Keys ──
export { queryKeys } from '@/src/api/queryKeys';

// ── Users ──
export function useUpdateProfile() {
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => usersApi.updateProfile(data).then((res) => res.data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
    },
  });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: async () => (await usersApi.search(query)).data,
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useGithubStatus() {
  return useQuery({
    queryKey: queryKeys.githubStatus,
    queryFn: () => usersApi.githubStatus().then((res) => res.data),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useGithubRepos() {
  return useQuery({
    queryKey: queryKeys.githubRepos,
    queryFn: () => githubApi.repos().then((res) => res.data),
  });
}

export function useGithubPulls(owner: string, repo: string) {
  return useQuery({
    queryKey: queryKeys.githubPulls(owner, repo),
    queryFn: () => githubApi.pulls(owner, repo).then((res) => res.data),
    enabled: Boolean(owner && repo),
  });
}

export function useDisconnectGithub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.disconnectGithub(),
    onSuccess: () => qc.setQueryData(queryKeys.githubStatus, { connected: false, username: null }),
  });
}

// ── Projects ──
export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => (await projectsApi.list()).data,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: async () => (await projectsApi.get(id)).data,
    enabled: !!id,
  });
}

export function useProjectStats(id: string) {
  return useQuery({
    queryKey: queryKeys.projectStats(id),
    queryFn: async () => (await projectsApi.stats(id)).data,
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useAddMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddMemberRequest) => projectsApi.addMember(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}

export function useUpdateMemberRole(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateMemberRoleRequest }) =>
      projectsApi.updateMemberRole(projectId, userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}

export function useRemoveMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(projectId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProjectRequest) => projectsApi.update(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects });
      qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}

// ── Issues ──
export function useIssues(filter?: IssueFilter) {
  return useQuery({
    queryKey: queryKeys.issues(filter),
    queryFn: async () => (await issuesApi.list(filter)).data,
  });
}

export function useIssue(id: string) {
  return useQuery({
    queryKey: queryKeys.issue(id),
    queryFn: async () => (await issuesApi.get(id)).data,
    enabled: !!id,
  });
}

export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateIssueRequest) => issuesApi.create(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.issues({ projectId: variables.projectId }) });
      qc.invalidateQueries({ queryKey: queryKeys.project(variables.projectId) });
    },
  });
}

export function useUpdateStatus(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateStatusRequest) =>
      issuesApi.updateStatus(issueId, data).then((res) => res.data),
    onSuccess: (updatedIssue) => {
      patchIssueCollections(qc, updatedIssue.projectId, issueId, updatedIssue);
      qc.invalidateQueries({ queryKey: queryKeys.issue(issueId) });
      qc.invalidateQueries({ queryKey: queryKeys.activity(issueId) });
      qc.invalidateQueries({ queryKey: queryKeys.projectStats(updatedIssue.projectId) });
    },
  });
}

export function useUpdatePriority(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePriorityRequest) =>
      issuesApi.updatePriority(issueId, data).then((res) => res.data),
    onSuccess: (updatedIssue) => {
      patchIssueCollections(qc, updatedIssue.projectId, issueId, updatedIssue);
      qc.invalidateQueries({ queryKey: queryKeys.issue(issueId) });
      qc.invalidateQueries({ queryKey: queryKeys.activity(issueId) });
    },
  });
}

export function useUpdateAssignee(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAssigneeRequest) =>
      issuesApi.updateAssignee(issueId, data).then((res) => res.data),
    onSuccess: (updatedIssue) => {
      patchIssueCollections(qc, updatedIssue.projectId, issueId, updatedIssue);
      qc.invalidateQueries({ queryKey: queryKeys.issue(issueId) });
      qc.invalidateQueries({ queryKey: queryKeys.activity(issueId) });
    },
  });
}

// ── Comments ──
export function useComments(issueId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.comments(issueId),
    queryFn: ({ pageParam }) => commentsApi.list(issueId, pageParam).then((res) => res.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !!issueId,
  });
}

export function useCreateComment(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCommentRequest) => commentsApi.create(issueId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.comments(issueId) });
      qc.invalidateQueries({ queryKey: queryKeys.activity(issueId) });
      qc.invalidateQueries({ queryKey: queryKeys.issue(issueId) });
    },
  });
}

// ── Activity ──
export function useActivity(issueId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.activity(issueId),
    queryFn: ({ pageParam }) => activityApi.list(issueId, pageParam).then((res) => res.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !!issueId,
  });
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ pageParam }) => notificationsApi.list({ cursor: pageParam, limit: 20 }).then((res) => res.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.unreadNotifications,
    queryFn: () => notificationsApi.unreadCount().then((res) => res.data),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: (_, id) => {
      qc.setQueryData(queryKeys.notifications, (current: any) => current ? {
        ...current,
        pages: current.pages.map((page: any) => ({
          ...page,
          items: page.items.map((item: any) => item.id === id ? { ...item, isRead: true } : item),
        })),
      } : current);
      qc.setQueryData<{ count: number }>(queryKeys.unreadNotifications, (current) => current ? { count: Math.max(0, current.count - 1) } : current);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.setQueryData(queryKeys.notifications, (current: any) => current ? {
        ...current,
        pages: current.pages.map((page: any) => ({ ...page, items: page.items.map((item: any) => ({ ...item, isRead: true })) })),
      } : current);
      qc.setQueryData(queryKeys.unreadNotifications, { count: 0 });
    },
  });
}
