import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useIssues } from '@/src/api/hooks';
import { useAuthStore } from '@/src/store/useAuthStore';
import { IssueCard } from '@/src/components/IssueCard';

export default function MyWorkScreen() {
  const user = useAuthStore((state) => state.user);
  const { data: issues, isLoading, error } = useIssues(user ? { assigneeId: user.id } : undefined);
  if (isLoading) return <View className="flex-1 items-center justify-center bg-slate-50"><ActivityIndicator size="large" /></View>;
  if (error) return <View className="flex-1 items-center justify-center bg-slate-50 px-6"><Text className="text-center text-red-600">Failed to load your assigned issues.</Text></View>;
  return <View className="flex-1 bg-slate-50 px-4 pt-5"><Text className="text-2xl font-semibold text-slate-900">My Work</Text><Text className="mb-4 mt-1 text-sm text-slate-500">Issues currently assigned to you</Text><FlatList data={issues} keyExtractor={(item) => item.id} renderItem={({ item }) => <IssueCard issue={item} onPress={() => router.push(`/(app)/issues/${item.id}` as any)} />} contentContainerStyle={{ paddingBottom: 24 }} ListEmptyComponent={<View className="mt-16 items-center rounded-xl bg-white p-6"><Text className="text-base font-semibold text-slate-800">You’re all caught up</Text><Text className="mt-1 text-sm text-slate-500">No issues are assigned to you right now.</Text></View>} /></View>;
}
