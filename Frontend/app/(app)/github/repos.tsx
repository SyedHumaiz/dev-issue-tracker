import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useGithubRepos } from '@/src/api/hooks';
import { GithubRepo } from '@/src/types';
import { EmptyState } from '@/src/components/EmptyState';
import { requiresGithubReconnect } from '@/src/utils/github';

export default function GithubReposScreen() {
  const repos = useGithubRepos();
  const reconnectPromptShown = useRef(false);

  useEffect(() => {
    if (!repos.error || !requiresGithubReconnect(repos.error) || reconnectPromptShown.current) return;
    reconnectPromptShown.current = true;
    Alert.alert('Reconnect GitHub', 'Your GitHub connection needs to be restored before repositories can be loaded.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Go to Profile', onPress: () => router.replace('/(app)/(tabs)/profile' as any) },
    ]);
  }, [repos.error]);

  if (repos.isLoading) return <LoadingState label="Loading repositories…" />;
  if (repos.error) return <ErrorState onRetry={repos.refetch} />;

  return (
    <View className="flex-1 bg-background p-4 dark:bg-background-dark">
      <FlatList
        data={repos.data ?? []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <RepoCard repo={item} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={repos.isRefetching} onRefresh={repos.refetch} tintColor="#2563eb" />}
        ListEmptyComponent={<EmptyState icon="folder-open" title="No repositories found" subtitle="Repositories available to your connected GitHub account will appear here." iconColor="#2563eb" iconContainerClassName="bg-blue-50 dark:bg-blue-950" />}
      />
    </View>
  );
}

function RepoCard({ repo }: { repo: GithubRepo }) {
  const [owner] = repo.fullName.split('/');
  return <Pressable onPress={() => router.push(`/(app)/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo.name)}/pulls` as any)} className="mb-3 flex-row items-center rounded-xl border border-border bg-surface p-4 shadow-sm dark:border-border-dark dark:bg-surface-dark"><View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950"><MaterialIcons name={repo.private ? 'lock-outline' : 'folder-open'} size={21} color="#2563eb" /></View><View className="flex-1"><Text className="text-base font-semibold text-foreground dark:text-foreground-dark">{repo.name}</Text><Text className="mt-1 text-sm text-muted dark:text-muted-dark">{repo.fullName} · Updated {new Date(repo.updatedAt).toLocaleDateString()}</Text></View><MaterialIcons name="chevron-right" size={22} color="#94a3b8" /></Pressable>;
}

function LoadingState({ label }: { label: string }) {
  return <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark"><ActivityIndicator size="large" color="#2563eb" /><Text className="mt-3 text-sm text-muted dark:text-muted-dark">{label}</Text></View>;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <View className="flex-1 items-center justify-center bg-background p-6 dark:bg-background-dark"><Text className="text-center text-sm text-muted dark:text-muted-dark">Could not load repositories.</Text><Pressable onPress={onRetry} className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5"><Text className="font-semibold text-white">Retry</Text></Pressable></View>;
}
