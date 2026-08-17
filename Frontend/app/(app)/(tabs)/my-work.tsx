import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useIssues } from '@/src/api/hooks';
import { useAuthStore } from '@/src/store/useAuthStore';
import { IssueCard } from '@/src/components/IssueCard';

export default function MyWorkScreen() {
  const user = useAuthStore((state) => state.user);
  const { data: issues, isLoading, error } = useIssues(user ? { assigneeId: user.id } : undefined);
  if (isLoading) return <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark"><ActivityIndicator size="large" /><Text className="mt-3 text-sm text-muted dark:text-muted-dark">Loading your work…</Text></View>;
  if (error) return <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark px-6"><Text className="text-center text-red-600">Failed to load your assigned issues.</Text></View>;
  return <View className="flex-1 bg-background dark:bg-background-dark px-4 pt-5"><Text className="text-2xl font-semibold text-foreground dark:text-foreground-dark">My Work</Text><Text className="mb-4 mt-1 text-sm text-muted dark:text-muted-dark">Issues currently assigned to you</Text><FlatList data={issues} keyExtractor={(item) => item.id} renderItem={({ item }) => <IssueCard issue={item} onPress={() => router.push(`/(app)/issues/${item.id}` as any)} />} contentContainerStyle={{ paddingBottom: 24 }} ListEmptyComponent={<View className="mt-16 items-center rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-6"><View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950"><MaterialIcons name="done-all" size={21} color="#059669" /></View><Text className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-100">You’re all caught up</Text><Text className="mt-1 text-center text-sm text-muted dark:text-muted-dark">No issues are currently assigned to you.</Text></View>} /></View>;
}
