import React, { useCallback } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { ProfileRedesign } from '@/src/components/ProfileRedesign';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useDisconnectGithub, useGithubStatus } from '@/src/api/hooks';
import { getErrorMessage } from '@/src/utils/error';
import { useFocusEffect } from '@react-navigation/native';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore((state) => state.token);
  const githubStatus = useGithubStatus();
  const disconnectGithub = useDisconnectGithub();

  // The auth browser can resume the app before the profile query observes a mount/focus transition.
  // Always re-check when this tab becomes active so returning from OAuth cannot leave stale UI.
  useFocusEffect(useCallback(() => {
    if (token) void githubStatus.refetch();
  }, [token, githubStatus.refetch]));

  const connectGithub = async () => {
    if (!token) return;
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    try {
      const result = await WebBrowser.openAuthSessionAsync(`${apiUrl}/auth/github?token=${encodeURIComponent(token)}`, 'devtracker://github-connected');
      if (result.type === 'success') {
        const params = new URL(result.url).searchParams;
        if (params.get('status') === 'success') await githubStatus.refetch();
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
  return <View className="flex-1"><ProfileRedesign user={user} onLogout={logout} githubStatus={githubStatus.data} onConnectGithub={connectGithub} onDisconnectGithub={removeGithub} githubLoading={busy} /><View className="absolute bottom-5 left-5 right-5 rounded-2xl border border-border bg-surface p-4 shadow-lg dark:border-border-dark dark:bg-surface-dark"><View className="flex-row items-center"><FontAwesome name="github" size={22} color="#94a3b8" /><View className="ml-3 flex-1"><Text className="font-semibold text-foreground dark:text-foreground-dark">GitHub integration</Text><Text className="mt-0.5 text-xs text-muted dark:text-muted-dark">{githubStatus.data?.connected ? `Connected as ${githubStatus.data.username}` : 'Connect to enable repository features'}</Text></View>{busy ? <ActivityIndicator color="#2563eb" /> : githubStatus.data?.connected ? <Pressable onPress={removeGithub} className="rounded-lg border border-red-200 px-3 py-2 dark:border-red-900"><Text className="text-xs font-semibold text-red-500">Disconnect</Text></Pressable> : <Pressable onPress={connectGithub} className="rounded-lg bg-blue-600 px-3 py-2"><Text className="text-xs font-semibold text-white">Connect</Text></Pressable>}</View></View></View>;
}
