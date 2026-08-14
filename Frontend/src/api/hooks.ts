import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, issuesApi, commentsApi, activityApi, usersApi } from '@/src/api/endpoints';
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
} from '@/src/types';
import { useAuthStore } from '@/src/store/useAuthStore';

// ── Query Keys ──
export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  issues: (filter?: IssueFilter) => ['issues', filter] as const,
  issue: (id: string) => ['issues', id] as const,
  comments: (issueId: string) => ['comments', issueId] as const,
  activity: (issueId: string) => ['activity', issueId] as const,
};

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
    mutationFn: (data: UpdateStatusRequest) => issuesApi.updateStatus(issueId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issue(issueId) });
      qc.invalidateQueries({ queryKey: queryKeys.activity(issueId) });
    },
  });
}

export function useUpdatePriority(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePriorityRequest) => issuesApi.updatePriority(issueId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issue(issueId) });
      qc.invalidateQueries({ queryKey: queryKeys.activity(issueId) });
    },
  });
}

export function useUpdateAssignee(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAssigneeRequest) => issuesApi.updateAssignee(issueId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issue(issueId) });
      qc.invalidateQueries({ queryKey: queryKeys.activity(issueId) });
    },
  });
}

// ── Comments ──
export function useComments(issueId: string) {
  return useQuery({
    queryKey: queryKeys.comments(issueId),
    queryFn: async () => (await commentsApi.list(issueId)).data,
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
  return useQuery({
    queryKey: queryKeys.activity(issueId),
    queryFn: async () => (await activityApi.list(issueId)).data,
    enabled: !!issueId,
  });
}
