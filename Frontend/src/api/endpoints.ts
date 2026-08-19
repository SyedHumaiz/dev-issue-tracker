import { apiClient } from '@/src/api/client';
import {
  AuthResponse,
  SignupRequest,
  LoginRequest,
  User,
  UserSearchResult,
  UpdateProfileRequest,
  ProjectListItem,
  ProjectDetail,
  CreateProjectRequest,
  AddMemberRequest,
  UpdateMemberRoleRequest,
  ProjectMember,
  ProjectStats,
  UpdateProjectRequest,
  IssueListItem,
  IssueDetail,
  CreateIssueRequest,
  UpdateStatusRequest,
  UpdatePriorityRequest,
  UpdateAssigneeRequest,
  IssueFilter,
  Comment,
  CreateCommentRequest,
  Activity,
  CursorPage,
  Notification,
  GithubStatus,
  GithubRepo,
  GithubPull,
  GithubPullDetail,
  MergeMethod,
} from '@/src/types';

// ── Auth ──
export const authApi = {
  signup: (data: SignupRequest) =>
    apiClient.post<AuthResponse>('/auth/signup', data),

  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  me: () =>
    apiClient.get<User>('/auth/me'),

  disconnectGithub: () => apiClient.delete('/auth/github'),
};

// ── Users ──
export const usersApi = {
  search: (query: string) =>
    apiClient.get<UserSearchResult[]>('/users/search', { params: { q: query } }),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.patch<User>('/users/profile', data),

  githubStatus: () => apiClient.get<GithubStatus>('/users/me/github-status'),
};

export const githubApi = {
  repos: () => apiClient.get<GithubRepo[]>('/github/repos'),
  pulls: (owner: string, repo: string) =>
    apiClient.get<GithubPull[]>(`/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`),
  pullDetail: (owner: string, repo: string, number: number) =>
    apiClient.get<GithubPullDetail>(`/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`),
  mergePull: (owner: string, repo: string, number: number, mergeMethod: MergeMethod) =>
    apiClient.put<{ merged: boolean; sha: string; message: string }>(`/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}/merge`, { mergeMethod }),
};

// ── Projects ──
export const projectsApi = {
  list: () =>
    apiClient.get<ProjectListItem[]>('/projects'),

  get: (id: string) =>
    apiClient.get<ProjectDetail>(`/projects/${id}`),

  stats: (id: string) =>
    apiClient.get<ProjectStats>(`/projects/${id}/stats`),

  create: (data: CreateProjectRequest) =>
    apiClient.post<ProjectDetail>('/projects', data),

  update: (id: string, data: UpdateProjectRequest) =>
    apiClient.patch(`/projects/${id}`, data),

  addMember: (projectId: string, data: AddMemberRequest) =>
    apiClient.post<ProjectMember>(`/projects/${projectId}/members`, data),

  updateMemberRole: (projectId: string, userId: string, data: UpdateMemberRoleRequest) =>
    apiClient.patch<ProjectMember>(`/projects/${projectId}/members/${userId}`, data),

  removeMember: (projectId: string, userId: string) =>
    apiClient.delete(`/projects/${projectId}/members/${userId}`),
};

// ── Issues ──
export const issuesApi = {
  list: (filter?: IssueFilter) =>
    apiClient.get<IssueListItem[]>('/issues', { params: filter }),

  get: (id: string) =>
    apiClient.get<IssueDetail>(`/issues/${id}`),


  create: (data: CreateIssueRequest) =>
    apiClient.post<IssueListItem>('/issues', data),

  updateStatus: (id: string, data: UpdateStatusRequest) =>
    apiClient.patch<IssueListItem>(`/issues/${id}/status`, data),

  updatePriority: (id: string, data: UpdatePriorityRequest) =>
    apiClient.patch<IssueListItem>(`/issues/${id}/priority`, data),

  updateAssignee: (id: string, data: UpdateAssigneeRequest) =>
    apiClient.patch<IssueListItem>(`/issues/${id}/assignee`, data),
};

// ── Comments ──
export const commentsApi = {
  list: (issueId: string, cursor?: string) =>
    apiClient.get<CursorPage<Comment>>(`/issues/${issueId}/comments`, { params: { limit: 20, ...(cursor ? { cursor } : {}) } }),

  create: (issueId: string, data: CreateCommentRequest) =>
    apiClient.post<Comment>(`/issues/${issueId}/comments`, data),
};

// ── Activity ──
export const activityApi = {
  list: (issueId: string, cursor?: string) =>
    apiClient.get<CursorPage<Activity>>(`/issues/${issueId}/activity`, { params: { limit: 20, ...(cursor ? { cursor } : {}) } }),
  listProject: (projectId: string, cursor?: string) =>
    apiClient.get<CursorPage<Activity>>(`/projects/${projectId}/activity`, { params: { limit: 20, ...(cursor ? { cursor } : {}) } }),
};

export const notificationsApi = {
  list: (params?: { cursor?: string; limit?: number }) =>
    apiClient.get<{ items: Notification[]; nextCursor: string | null }>('/notifications', { params }),
  unreadCount: () => apiClient.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => apiClient.patch<Notification>(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
};
