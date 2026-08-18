-- Supports bounded newest-first issue and timeline queries.
CREATE INDEX "Issue_projectId_createdAt_idx" ON "Issue"("projectId", "createdAt");
CREATE INDEX "Issue_assigneeId_createdAt_idx" ON "Issue"("assigneeId", "createdAt");
CREATE INDEX "Comment_issueId_createdAt_id_idx" ON "Comment"("issueId", "createdAt", "id");
CREATE INDEX "Activity_issueId_createdAt_id_idx" ON "Activity"("issueId", "createdAt", "id");
