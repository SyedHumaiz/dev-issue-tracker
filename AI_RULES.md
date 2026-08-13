# AI Development Rules

1. Read PROJECT_CONTEXT.md before making project changes.

2. PROJECT_CONTEXT.md is the source of truth.

3. Do not add features outside V1 scope without asking first.

4. Do not modify the database schema without explaining the reason.

5. Do not introduce Redis, BullMQ, offline sync, push notifications,
   GitHub integration, or advanced RBAC in V1.

6. Keep frontend and backend separate.

7. Use TypeScript.

8. Prefer simple, understandable implementations over unnecessary
   abstractions.

9. Do not generate large amounts of code without explaining what
   is being changed.

10. After completing a task, report:
    - files created/modified
    - what was implemented
    - how to test it
    - important concepts I should understand

11. Do not overwrite existing work without checking it first.

12. Before implementing a feature, inspect the existing codebase
    and follow its established patterns.

13. If a requirement is ambiguous, ask before making a major
    architectural decision.

14. Keep the application mobile-first. Do not design web-dashboard
    UI patterns for the React Native app.

15. Keep the V1 architecture intentionally simple:
    PostgreSQL + Prisma + NestJS + Socket.IO + Expo.