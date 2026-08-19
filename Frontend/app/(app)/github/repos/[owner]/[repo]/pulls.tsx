import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Modal, Pressable, RefreshControl, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useGithubPullDetail, useGithubPulls, useMergeGithubPull, useProjects } from '@/src/api/hooks';
import { GithubPull, GithubPullDetail, MergeMethod, Role } from '@/src/types';
import { EmptyState } from '@/src/components/EmptyState';
import { requiresGithubReconnect } from '@/src/utils/github';
import { getErrorMessage } from '@/src/utils/error';
import { useAuthStore } from '@/src/store/useAuthStore';

type MergeTarget = { pull: GithubPull; detail: GithubPullDetail };

export default function GithubPullsScreen() {
  const params = useLocalSearchParams<{ owner: string; repo: string }>();
  const owner = typeof params.owner === 'string' ? params.owner : '';
  const repo = typeof params.repo === 'string' ? params.repo : '';
  const pulls = useGithubPulls(owner, repo);
  const projects = useProjects();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const merge = useMergeGithubPull(owner, repo);
  const [mergeTarget, setMergeTarget] = useState<MergeTarget | null>(null);
  const reconnectPromptShown = useRef(false);
  const linkedProject = projects.data?.find(
    (project) => project.githubRepoFullName?.toLowerCase() === `${owner}/${repo}`.toLowerCase(),
  );
  const isProjectOwner = linkedProject?.members.some(
    (member) => member.userId === currentUserId && member.role === Role.OWNER,
  ) ?? false;

  // Temporary diagnostic output for the owner-only Merge action.
  useEffect(() => {
    const currentMembership = linkedProject?.members.find((member) => member.userId === currentUserId);
    console.log('[GitHub merge visibility]', {
      routeRepo: `${owner}/${repo}`,
      projectsLoading: projects.isLoading,
      projectsError: projects.isError,
      projectRepos: projects.data?.map((project) => project.githubRepoFullName),
      linkedProjectId: linkedProject?.id ?? null,
      currentUserId: currentUserId ?? null,
      currentUserRole: currentMembership?.role ?? null,
      isProjectOwner,
    });
  }, [owner, repo, projects.data, projects.isLoading, projects.isError, linkedProject, currentUserId, isProjectOwner]);

  useEffect(() => {
    if (!pulls.error || !requiresGithubReconnect(pulls.error) || reconnectPromptShown.current) return;
    reconnectPromptShown.current = true;
    Alert.alert('Reconnect GitHub', 'Your GitHub connection needs to be restored before pull requests can be loaded.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Go to Profile', onPress: () => router.replace('/(app)/(tabs)/profile' as any) },
    ]);
  }, [pulls.error]);

  const confirmMerge = async (mergeMethod: MergeMethod) => {
    if (!mergeTarget) return;
    try {
      const result = await merge.mutateAsync({ number: mergeTarget.pull.number, mergeMethod });
      setMergeTarget(null);
      Alert.alert('Pull request merged', result.message || `PR #${mergeTarget.pull.number} was merged successfully.`);
    } catch (error) {
      Alert.alert('Could not merge pull request', getErrorMessage(error));
    }
  };

  if (pulls.isLoading) return <LoadingState />;
  if (pulls.error) return <ErrorState error={pulls.error} onRetry={pulls.refetch} />;

  return (
    <View className="flex-1 bg-background p-4 dark:bg-background-dark">
      <FlatList
        data={pulls.data ?? []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <PullCard pull={item} owner={owner} repo={repo} showMergeAction={isProjectOwner} isMerging={merge.isPending && merge.variables?.number === item.number} onMerge={(detail) => setMergeTarget({ pull: item, detail })} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={pulls.isRefetching} onRefresh={pulls.refetch} tintColor="#2563eb" />}
        ListEmptyComponent={<EmptyState icon="merge-type" title="No open pull requests" subtitle="Open pull requests for this repository will appear here." iconColor="#2563eb" iconContainerClassName="bg-blue-50 dark:bg-blue-950" />}
      />
      <MergeConfirmationModal target={mergeTarget} isMerging={merge.isPending} onCancel={() => !merge.isPending && setMergeTarget(null)} onConfirm={confirmMerge} />
    </View>
  );
}

function PullCard({ pull, owner, repo, showMergeAction, isMerging, onMerge }: { pull: GithubPull; owner: string; repo: string; showMergeAction: boolean; isMerging: boolean; onMerge: (detail: GithubPullDetail) => void }) {
  const detail = useGithubPullDetail(owner, repo, pull.number);
  const openPull = () => Linking.openURL(pull.htmlUrl).catch(() => Alert.alert('Could not open GitHub', 'Please try again.'));
  const mergeStatus = detail.isError
    ? { kind: 'blocked', label: 'Could not verify merge status' }
    : getMergeStatus(detail.data);
  const canMerge = mergeStatus.kind === 'ready';

  return (
    <View className="mb-3 rounded-xl border border-border bg-surface p-4 shadow-sm dark:border-border-dark dark:bg-surface-dark">
      <Pressable onPress={openPull} className="flex-row items-start">
        <View className="mr-3 h-9 w-9 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">{pull.author.avatarUrl ? <Image source={{ uri: pull.author.avatarUrl }} className="h-full w-full" /> : <MaterialIcons name="person" size={20} color="#94a3b8" />}</View>
        <View className="flex-1"><Text className="text-base font-semibold text-foreground dark:text-foreground-dark">{pull.title}</Text><Text className="mt-1 text-sm text-muted dark:text-muted-dark">#{pull.number} · {pull.author.login}</Text></View>
        <MaterialIcons name="open-in-new" size={19} color="#94a3b8" />
      </Pressable>
      <View className="mt-3 flex-row items-center justify-between border-t border-border pt-3 dark:border-border-dark">
        <Text className={`text-xs font-medium ${canMerge ? 'text-emerald-600' : 'text-muted dark:text-muted-dark'}`}>{mergeStatus.label}</Text>
        {showMergeAction && <Pressable disabled={!canMerge || isMerging} onPress={() => detail.data && onMerge(detail.data)} className={`min-w-24 items-center rounded-lg px-3 py-2 ${canMerge && !isMerging ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}>{isMerging ? <ActivityIndicator size="small" color="#fff" /> : <Text className={`text-sm font-semibold ${canMerge ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>Merge</Text>}</Pressable>}
      </View>
    </View>
  );
}

function getMergeStatus(detail: GithubPullDetail | undefined) {
  if (!detail) return { kind: 'pending', label: 'Checking merge status…' };
  if (detail.merged) return { kind: 'blocked', label: 'Already merged' };
  if (detail.mergeable === false || detail.mergeableState === 'dirty') return { kind: 'blocked', label: 'Has conflicts' };
  if (detail.mergeable === true && detail.mergeableState === 'clean') return { kind: 'ready', label: 'Ready to merge' };
  return { kind: 'pending', label: 'Checks pending' };
}

function MergeConfirmationModal({ target, isMerging, onCancel, onConfirm }: { target: MergeTarget | null; isMerging: boolean; onCancel: () => void; onConfirm: (method: MergeMethod) => void }) {
  const [method, setMethod] = useState<MergeMethod>('merge');
  useEffect(() => setMethod('merge'), [target?.pull.number]);
  if (!target) return null;
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}><View className="flex-1 items-center justify-center bg-black/50 p-5"><View className="w-full rounded-2xl bg-surface p-5 dark:bg-surface-dark"><Text className="text-lg font-bold text-foreground dark:text-foreground-dark">Merge pull request?</Text><Text className="mt-2 text-sm text-muted dark:text-muted-dark">This will merge PR #{target.pull.number} into {target.detail.baseBranch}. This action cannot be undone.</Text><Text className="mt-5 text-xs font-semibold text-muted dark:text-muted-dark">MERGE METHOD</Text><View className="mt-2 flex-row gap-2">{(['merge', 'squash', 'rebase'] as MergeMethod[]).map((option) => <Pressable key={option} disabled={isMerging} onPress={() => setMethod(option)} className={`flex-1 rounded-lg px-2 py-2 ${method === option ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}><Text className={`text-center text-xs font-semibold ${method === option ? 'text-white' : 'text-muted dark:text-muted-dark'}`}>{option[0].toUpperCase() + option.slice(1)}</Text></Pressable>)}</View><View className="mt-6 flex-row justify-end gap-3"><Pressable disabled={isMerging} onPress={onCancel} className="px-3 py-2"><Text className="font-semibold text-muted dark:text-muted-dark">Cancel</Text></Pressable><Pressable disabled={isMerging} onPress={() => onConfirm(method)} className="min-w-28 items-center rounded-lg bg-emerald-600 px-4 py-2">{isMerging ? <ActivityIndicator size="small" color="#fff" /> : <Text className="font-semibold text-white">Confirm merge</Text>}</Pressable></View></View></View></Modal>;
}

function LoadingState() {
  return <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark"><ActivityIndicator size="large" color="#2563eb" /><Text className="mt-3 text-sm text-muted dark:text-muted-dark">Loading pull requests…</Text></View>;
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const errorMessage = getErrorMessage(error);
  const message = errorMessage.startsWith('Cannot GET')
    ? 'Could not load pull requests. Please retry in a moment.'
    : errorMessage;
  return <View className="flex-1 items-center justify-center bg-background p-6 dark:bg-background-dark"><Text className="text-center text-sm text-muted dark:text-muted-dark">{message}</Text><Pressable onPress={onRetry} className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5"><Text className="font-semibold text-white">Retry</Text></Pressable></View>;
}
