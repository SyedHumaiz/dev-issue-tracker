Project Context: Dev Issue Tracker (V1)

Share this file/text with any AI tool to give it full context on the project.

What this is

A mobile-first issue tracker for small dev teams — React Native (Expo) frontend + NestJS backend. Built as a portfolio project to demonstrate production-style full-stack mobile development (real-time systems, relational data modeling, mobile-first UX), not just another CRUD app. Builder is a university student (8th semester) building their first RN + NestJS project.

Tech stack
Frontend: React Native via Expo
Backend: NestJS + Socket.io (WebSocket gateway)
Database: PostgreSQL via Prisma ORM
Auth: JWT
Monorepo: npm workspaces — apps/api (NestJS), apps/mobile (Expo)
Hosting plan (later): Railway/Render for API+Postgres (NOT Vercel — need long-running process for WebSockets/future BullMQ), Expo Go for demoing the mobile app, all free-tier
Core features (V1 scope — locked, do not expand)
Auth: JWT login/signup
Projects: have members via ProjectMember join table
Roles: OWNER (manage members, delete/edit project) and MEMBER (create/edit issues, comment) — access-level roles only, NOT job-title/seniority roles (that was deliberately rejected as out of scope/wrong pattern)
Issues: title, description, status (OPEN / IN_REVIEW / CLOSED, freely reversible — not a strict state machine), priority (LOW / MEDIUM / HIGH / CRITICAL, default MEDIUM), reporter (required), assignee (optional/nullable)
Comments: attached to an issue
Activity log: auto-generated entry on every meaningful mutation — issue created, status changed, priority changed, assignee changed, comment added. Stored as {issueId, actorId, type, meta (JSON with before/after), createdAt}. Rendered as a merged chronological timeline on the issue detail screen.
Real-time: Socket.io rooms, not a global broadcast. Client joins project:{projectId} room when viewing a project's issue list, and issue:{issueId} room when viewing issue detail. Server emits issue:created, issue:updated, comment:created, activity:created to relevant rooms. No Redis pub/sub needed for V1 (single server instance) — would only be needed if scaled to multiple instances.
Mobile-first UX: bottom tabs (Home = "My Work"/assigned issues across projects, Projects, Profile), swipe actions on issue lists, bottom sheets instead of modals, sticky comment input on issue detail — explicitly NOT a web dashboard squeezed onto a phone.
Explicitly deferred to V2 (do not build in V1)
Offline-first sync (local persistence + pending ops queue + conflict resolution)
Push notifications (Expo push)
GitHub OAuth + webhook integration (PR/deploy events)
BullMQ background job processing (needed for webhook ingestion)
Redis-based presence (who's online)
Any org-level/multi-tier RBAC beyond Owner/Member
Prisma schema (current, locked for V1)
prisma
enum Role { OWNER MEMBER }
enum IssueStatus { OPEN IN_REVIEW CLOSED }
enum Priority { LOW MEDIUM HIGH CRITICAL }
enum ActivityType { ISSUE_CREATED STATUS_CHANGED PRIORITY_CHANGED ASSIGNEE_CHANGED COMMENT_ADDED }

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  avatarUrl String?
  createdAt DateTime @default(now())
  memberships    ProjectMember[]
  reportedIssues Issue[]  @relation("Reporter")
  assignedIssues Issue[]  @relation("Assignee")
  comments       Comment[]
  activities     Activity[]
}

model Project {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  members ProjectMember[]
  issues  Issue[]
}

model ProjectMember {
  id        String   @id @default(cuid())
  role      Role     @default(MEMBER)
  userId    String
  projectId String
  createdAt DateTime @default(now())
  user    User    @relation(fields: [userId], references: [id])
  project Project @relation(fields: [projectId], references: [id])
  @@unique([userId, projectId])
}

model Issue {
  id          String      @id @default(cuid())
  title       String
  description String?
  status      IssueStatus @default(OPEN)
  priority    Priority    @default(MEDIUM)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  projectId String
  project   Project @relation(fields: [projectId], references: [id])
  reporterId String
  reporter   User   @relation("Reporter", fields: [reporterId], references: [id])
  assigneeId String?
  assignee   User?   @relation("Assignee", fields: [assigneeId], references: [id])
  comments   Comment[]
  activities Activity[]
}

model Comment {
  id        String   @id @default(cuid())
  body      String
  createdAt DateTime @default(now())
  issueId String
  issue   Issue  @relation(fields: [issueId], references: [id])
  authorId String
  author   User   @relation(fields: [authorId], references: [id])
}

model Activity {
  id        String       @id @default(cuid())
  type      ActivityType
  meta      Json
  createdAt DateTime     @default(now())
  issueId String
  issue   Issue  @relation(fields: [issueId], references: [id])
  actorId String
  actor   User   @relation(fields: [actorId], references: [id])
}
WebSocket event contract
Client → Server: join:project {projectId} | leave:project {projectId} | join:issue {issueId} | leave:issue {issueId}
Server → Client: issue:created {issue} | issue:updated {issueId, changes} | comment:created {issueId, comment} | activity:created {issueId, activity}
Build sequence (current plan)
Scaffold monorepo (apps/api NestJS, apps/mobile Expo) — DONE conceptually, verifying both run
Prisma schema + Postgres (Docker local or Supabase) + plain REST CRUD (Projects/Issues/Comments), no auth yet
Auth (JWT)
Connect mobile screens to real API (React Query for data fetching)
WebSocket gateway — start with one event, expand to full contract above
Activity log wiring into every mutation
Deploy (Railway/Render) + polish UI (swipe actions, bottom sheets, empty/loading states)
Where we currently are

Just finished scaffolding both apps locally (Step 5 above: confirming npm run start:dev and npx expo start both work). Next step is Postgres + Prisma setup.