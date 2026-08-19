// Enums matching the Prisma schema exactly
export enum Role {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export enum IssueStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  CLOSED = 'CLOSED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ActivityType {
  ISSUE_CREATED = 'ISSUE_CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  ASSIGNEE_CHANGED = 'ASSIGNEE_CHANGED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  GITHUB_PR_OPENED = 'GITHUB_PR_OPENED',
  GITHUB_PR_CLOSED = 'GITHUB_PR_CLOSED',
  GITHUB_PR_REOPENED = 'GITHUB_PR_REOPENED',
  GITHUB_PR_REVIEW_REQUESTED = 'GITHUB_PR_REVIEW_REQUESTED',
  GITHUB_PR_MERGED = 'GITHUB_PR_MERGED',
}

// ── User ──
// Shape returned by UsersService.findOne (select: id, email, name, avatarUrl, createdAt)
// Also the shape returned by GET /auth/me (via JwtStrategy.validate → UsersService.findOne)
export interface User {
  id: string;
  email: string;
  name: string;
  jobTitle: string;
  bio: string | null;
  skills: string[];
  githubUrl: string | null;
  githubUsername: string | null;
  linkedinUrl: string | null;
  yearsExperience: number | null;
  location: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

// Partial user shape included in nested relations (reporter, assignee, actor, author)
export interface UserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
}

// User shape included in project member relations (includes email)
export interface UserMemberInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

// Shape returned by GET /users/search — used for the searchable user selector
export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

// ── Auth ──
// Shape returned by POST /auth/signup and POST /auth/login
export interface AuthResponse {
  accessToken: string;
  user: User;
}

// ── ProjectMember ──
export interface ProjectMember {
  id: string;
  role: Role;
  userId: string;
  projectId: string;
  createdAt: string;
  user: UserMemberInfo;
}

// ── Project ──
// Shape returned by GET /projects (findAll) — includes members with user, and _count
export interface ProjectListItem {
  id: string;
  name: string;
  isArchived: boolean;
  githubRepoFullName: string | null;
  createdAt: string;
  members: ProjectMember[];
  _count: {
    issues: number;
    members: number;
  };
}

// Shape of issues nested inside ProjectDetail (from findOne includes)
export interface ProjectIssue {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  reporterId: string;
  assigneeId: string | null;
  reporter: UserSummary;
  assignee: UserSummary | null;
}

// Shape returned by GET /projects/:id (findOne) — includes members with user, and issues
export interface ProjectDetail {
  id: string;
  name: string;
  isArchived: boolean;
  githubRepoFullName: string | null;
  createdAt: string;
  members: ProjectMember[];
  issues: ProjectIssue[];
}

export interface ProjectStats {
  total: number;
  open: number;
  inReview: number;
  closed: number;
}

// ── Issue ──
// Shape returned by GET /issues (findAll) — includes project, reporter, assignee, _count.comments
export interface IssueListItem {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  reporterId: string;
  assigneeId: string | null;
  project: { id: string; name: string };
  reporter: UserSummary;
  assignee: UserSummary | null;
  _count: { comments: number };
}

// Shape returned by GET /issues/:id (findOne) — includes comments, activities
export interface IssueDetail {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  reporterId: string;
  assigneeId: string | null;
  project: { id: string; name: string };
  reporter: UserSummary;
  assignee: UserSummary | null;
  comments: Comment[];
  activities: Activity[];
}

// ── Comment ──
export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  issueId: string;
  authorId: string;
  author: UserSummary;
}

// ── Activity ──
export interface Activity {
  id: string;
  type: ActivityType;
  meta: Record<string, any>;
  createdAt: string;
  issueId: string | null;
  projectId: string | null;
  actorId: string | null;
  actor: UserSummary | null;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ── Request DTOs (what the frontend sends to the backend) ──
export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  jobTitle: string;
  avatarUrl?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  jobTitle?: string;
  bio?: string;
  skills?: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  yearsExperience?: number;
  location?: string;
  avatarUrl?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateProjectRequest {
  name: string;
}

export interface AddMemberRequest {
  userId: string;
  role?: Role;
}

export interface UpdateMemberRoleRequest {
  role: Role;
}

export interface UpdateProjectRequest {
  name?: string;
  isArchived?: boolean;
  githubRepoFullName?: string;
}

export interface CreateIssueRequest {
  title: string;
  description?: string;
  status?: IssueStatus;
  priority?: Priority;
  projectId: string;
  assigneeId?: string | null;
}

export interface UpdateIssueRequest {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: Priority;
  assigneeId?: string | null;
}

export interface UpdateStatusRequest {
  status: IssueStatus;
}

export interface UpdatePriorityRequest {
  priority: Priority;
}

export interface UpdateAssigneeRequest {
  assigneeId?: string | null;
}

export interface CreateCommentRequest {
  body: string;
}

export interface GithubStatus {
  connected: boolean;
  username: string | null;
}

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  updatedAt: string;
}

export interface GithubPull {
  id: number;
  number: number;
  title: string;
  state: string;
  author: { login: string; avatarUrl: string };
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type MergeMethod = 'merge' | 'squash' | 'rebase';

export interface GithubPullDetail extends GithubPull {
  mergeable: boolean | null;
  mergeableState: string;
  merged: boolean;
  baseBranch: string;
}

export interface IssueFilter {
  projectId?: string;
  status?: IssueStatus;
  priority?: Priority;
  assigneeId?: string;
  reporterId?: string;
}

export type NotificationType =
  | 'ISSUE_ASSIGNED'
  | 'COMMENT_ADDED'
  | 'MENTIONED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'PROJECT_INVITED'
  | 'GITHUB_PR_OPENED'
  | 'GITHUB_PR_CLOSED'
  | 'GITHUB_PR_REOPENED'
  | 'GITHUB_PR_REVIEW_REQUESTED'
  | 'GITHUB_PR_MERGED';

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string | null;
  actor: UserSummary | null;
  type: NotificationType;
  title: string;
  message: string;
  projectId: string | null;
  issueId: string | null;
  isRead: boolean;
  createdAt: string;
}
