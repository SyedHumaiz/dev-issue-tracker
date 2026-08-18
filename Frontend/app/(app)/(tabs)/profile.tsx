import React, { useCallback } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { ProfileRedesign } from '@/src/components/ProfileRedesign';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useDisconnectGithub, useGithubStatus } from '@/src/api/hooks';
import { queryKeys } from '@/src/api/queryKeys';
import { getErrorMessage } from '@/src/utils/error';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const githubStatus = useGithubStatus();
  const disconnectGithub = useDisconnectGithub();

  const refreshGithubStatus = useCallback(async () => {
    // Invalidation refetches the mounted query and keeps it stale if this screen remounts later.
    await queryClient.invalidateQueries({ queryKey: queryKeys.githubStatus, exact: true });
  }, [queryClient]);

  // WebBrowser can resume the app without causing a React Navigation focus transition.
  // Refresh on navigation focus as a second path for returns from OAuth and normal tab changes.
  useFocusEffect(useCallback(() => {
    if (token) void refreshGithubStatus();
  }, [token, refreshGithubStatus]));

  const connectGithub = async () => {
    if (!token) return;
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    const redirectUri = Linking.createURL('github-connected');
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        `${apiUrl}/auth/github?token=${encodeURIComponent(token)}&redirectUri=${encodeURIComponent(redirectUri)}`,
        redirectUri,
      );
      if (result.type === 'success') {
        const params = new URL(result.url).searchParams;
        if (params.get('status') === 'success') await refreshGithubStatus();
        else Alert.alert('GitHub connection failed', 'GitHub could not be linked. Please try again.');
      }
    } catch (error) {
      Alert.alert('GitHub connection failed', getErrorMessage(error));
    }
  };

  const removeGithub = () => Alert.alert('Disconnect GitHub?', 'Repository access will be removed from this app.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Disconnect', style: 'destructive', onPress: () => disconnectGithub.mutate() },
  ]);

  if (!user) return null;

  const busy = githubStatus.isFetching || disconnectGithub.isPending;
  return <ProfileRedesign user={user} onLogout={logout} githubStatus={githubStatus.data} onConnectGithub={connectGithub} onDisconnectGithub={removeGithub} onBrowseGithubRepos={() => router.push('/(app)/github/repos' as any)} githubLoading={busy} />;
}
