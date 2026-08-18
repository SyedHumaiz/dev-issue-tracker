import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

for (const line of readFileSync(resolve(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
}

const userId = process.argv[2];
const verifyWithGithub = process.argv.includes('--verify');

if (!userId) {
  console.error('Usage: npx ts-node scripts/check-github-token.ts <userId> [--verify]');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, githubId: true, githubUsername: true, githubAccessToken: true },
  });

  if (!user) throw new Error('User not found');

  const hasToken = Boolean(user.githubAccessToken);
  console.log(JSON.stringify({
    userId: user.id,
    email: user.email,
    githubId: user.githubId,
    githubUsername: user.githubUsername,
    hasGithubAccessToken: hasToken,
  }, null, 2));

  if (verifyWithGithub && hasToken) {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${user.githubAccessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'dev-issue-tracker-token-check',
      },
    });
    const body = await response.json() as { login?: string; message?: string };
    console.log(JSON.stringify({ githubTokenAccepted: response.ok, status: response.status, login: body.login, message: body.message }, null, 2));
    if (!response.ok) process.exitCode = 2;
  }
}

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
