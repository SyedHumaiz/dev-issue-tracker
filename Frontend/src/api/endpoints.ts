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
  Notification,
} from '@/src/types';

// ── Auth ──
export const authApi = {
  signup: (data: SignupRequest) =>
    apiClient.post<AuthResponse>('/auth/signup', data),

  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  me: () =>
    apiClient.get<User>('/auth/me'),
};

// ── Users ──
export const usersApi = {
  search: (query: string) =>
    apiClient.get<UserSearchResult[]>('/users/search', { params: { q: query } }),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.patch<User>('/users/profile', data),
};

// ── Projects ──
export const projectsApi = {
  list: () =>
    apiClient.get<ProjectListItem[]>('/projects'),

  get: (id: string) =>
    apiClient.get<ProjectDetail>(`/projects/${id}`),

  create: (data: CreateProjectRequest) =>
    apiClient.post<ProjectDetail>('/projects', data),

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
  list: (issueId: string) =>
    apiClient.get<Comment[]>(`/issues/${issueId}/comments`),

  create: (issueId: string, data: CreateCommentRequest) =>
    apiClient.post<Comment>(`/issues/${issueId}/comments`, data),
};

// ── Activity ──
export const activityApi = {
  list: (issueId: string) =>
    apiClient.get<Activity[]>(`/issues/${issueId}/activity`),
};

export const notificationsApi = {
  list: (params?: { cursor?: string; limit?: number }) =>
    apiClient.get<{ items: Notification[]; nextCursor: string | null }>('/notifications', { params }),
  unreadCount: () => apiClient.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => apiClient.patch<Notification>(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
};
