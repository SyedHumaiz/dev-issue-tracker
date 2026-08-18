ALTER TABLE "User" ADD COLUMN "githubId" TEXT;
ALTER TABLE "User" ADD COLUMN "githubUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "githubAccessToken" TEXT;
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");
