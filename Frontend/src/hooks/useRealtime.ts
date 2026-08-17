import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/src/api/socket';
import { useAuthStore } from '@/src/store/useAuthStore';

/** Connect/disconnect the shared socket based on auth state. */
export function useRealtimeConnection() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id ?? null);

  useEffect(() => {
    socketService.configure(queryClient, userId);
  }, [queryClient, userId]);

  useEffect(() => {
    if (!token) {
      socketService.disconnect();
      return;
    }

    socketService.connect(token);
    return () => socketService.disconnect();
  }, [token]);
}

/** Join a project room while a project screen is mounted. */
export function useProjectRoom(projectId: string | undefined) {
  useEffect(() => {
    if (!projectId) return;
    socketService.joinProject(projectId);
    return () => socketService.leaveProject(projectId);
  }, [projectId]);
}

/** Join an issue room while an issue screen is mounted. */
export function useIssueRoom(issueId: string | undefined) {
  useEffect(() => {
    if (!issueId) return;
    socketService.joinIssue(issueId);
    return () => socketService.leaveIssue(issueId);
  }, [issueId]);
}
