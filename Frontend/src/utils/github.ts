import { isAxiosError } from 'axios';

export function requiresGithubReconnect(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const message = error.response?.data?.message;
  return message === 'GitHub not connected'
    || message === 'GitHub token is invalid or expired. Please reconnect GitHub.';
}
