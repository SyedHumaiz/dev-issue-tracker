import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Pressable, RefreshControl, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useGithubPulls } from '@/src/api/hooks';
import { GithubPull } from '@/src/types';
import { EmptyState } from '@/src/components/EmptyState';
import { requiresGithubReconnect } from '@/src/utils/github';

export default function GithubPullsScreen() {
  const params = useLocalSearchParams<{ owner: string; repo: string }>();
  const owner = typeof params.owner === 'string' ? params.owner : '';
  const repo = typeof params.repo === 'string' ? params.repo : '';
  const pulls = useGithubPulls(owner, repo);
  const reconnectPromptShown = useRef(false);

  useEffect(() => {
    if (!pulls.error || !requiresGithubReconnect(pulls.error) || reconnectPromptShown.current) return;
    reconnectPromptShown.current = true;
    Alert.alert('Reconnect GitHub', 'Your GitHub connection needs to be restored before pull requests can be loaded.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Go to Profile', onPress: () => router.replace('/(app)/(tabs)/profile' as any) },
    ]);
  }, [pulls.error]);

  if (pulls.isLoading) return <LoadingState />;
  if (pulls.error) return <ErrorState onRetry={pulls.refetch} />;

  return <View className="flex-1 bg-background p-4 dark:bg-background-dark"><FlatList data={pulls.data ?? []} keyExtractor={(item) => item.id.toString()} renderItem={({ item }) => <PullCard pull={item} />} contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={pulls.isRefetching} onRefresh={pulls.refetch} tintColor="#2563eb" />} ListEmptyComponent={<EmptyState icon="merge-type" title="No open pull requests" subtitle="Open pull requests for this repository will appear here." iconColor="#2563eb" iconContainerClassName="bg-blue-50 dark:bg-blue-950" />} /></View>;
}

function PullCard({ pull }: { pull: GithubPull }) {
  const openPull = () => Linking.openURL(pull.htmlUrl).catch(() => Alert.alert('Could not open GitHub', 'Please try again.'));
  return <Pressable onPress={openPull} className="mb-3 rounded-xl border border-border bg-surface p-4 shadow-sm dark:border-border-dark dark:bg-surface-dark"><View className="flex-row items-start"><View className="mr-3 h-9 w-9 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">{pull.author.avatarUrl ? <Image source={{ uri: pull.author.avatarUrl }} className="h-full w-full" /> : <MaterialIcons name="person" size={20} color="#94a3b8" />}</View><View className="flex-1"><Text className="text-base font-semibold text-foreground dark:text-foreground-dark">{pull.title}</Text><Text className="mt-1 text-sm text-muted dark:text-muted-dark">#{pull.number} · {pull.author.login}</Text></View><MaterialIcons name="open-in-new" size={19} color="#94a3b8" /></View></Pressable>;
}

function LoadingState() {
  return <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark"><ActivityIndicator size="large" color="#2563eb" /><Text className="mt-3 text-sm text-muted dark:text-muted-dark">Loading pull requests…</Text></View>;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <View className="flex-1 items-center justify-center bg-background p-6 dark:bg-background-dark"><Text className="text-center text-sm text-muted dark:text-muted-dark">Could not load pull requests.</Text><Pressable onPress={onRetry} className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5"><Text className="font-semibold text-white">Retry</Text></Pressable></View>;
}
