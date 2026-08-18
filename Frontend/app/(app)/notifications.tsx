import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/src/components/EmptyState';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/src/api/hooks';
import { Notification } from '@/src/types';

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString();
}

function iconFor(type: Notification['type']): keyof typeof MaterialIcons.glyphMap {
  if (type === 'COMMENT_ADDED') return 'chat-bubble-outline';
  if (type === 'ISSUE_ASSIGNED') return 'assignment-ind';
  if (type === 'PROJECT_INVITED') return 'group-add';
  if (type === 'STATUS_CHANGED') return 'sync';
  if (type === 'PRIORITY_CHANGED') return 'priority-high';
  return 'alternate-email';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const items = notifications.data?.pages.flatMap((page) => page.items) ?? [];

  const openNotification = (item: Notification) => {
    if (!item.isRead) markRead.mutate(item.id);
    if (item.issueId) router.push(`/(app)/issues/${item.issueId}` as any);
    else if (item.projectId) router.push(`/(app)/projects/${item.projectId}` as any);
  };

  if (notifications.isLoading) {
    return <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark"><ActivityIndicator size="large" color="#2563eb" /><Text className="mt-3 text-sm text-muted dark:text-muted-dark">Loading notifications…</Text></View>;
  }
  if (notifications.isError) {
    return <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark"><Text className="text-center text-red-600">Failed to load notifications.</Text></View>;
  }

  return (
    <View className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark">
      {items.length > 0 && <View className="mb-3 flex-row justify-end"><Pressable onPress={() => markAllRead.mutate()} disabled={markAllRead.isPending}><Text className="font-semibold text-blue-600 dark:text-blue-400">Mark all as read</Text></Pressable></View>}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        onEndReached={() => { if (notifications.hasNextPage && !notifications.isFetchingNextPage) notifications.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={<EmptyState compact icon="notifications-none" title="No notifications yet" subtitle="Updates about your projects and issues will appear here." iconColor="#2563eb" iconContainerClassName="bg-blue-50 dark:bg-blue-950" />}
        ListFooterComponent={notifications.isFetchingNextPage ? <ActivityIndicator className="py-4" color="#2563eb" /> : null}
        renderItem={({ item }) => <Pressable onPress={() => openNotification(item)} className={`mb-3 flex-row rounded-xl border p-4 ${item.isRead ? 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark' : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950'}`}>
          <View className={`h-10 w-10 items-center justify-center rounded-full ${item.isRead ? 'bg-slate-100 dark:bg-slate-800' : 'bg-blue-100 dark:bg-blue-900'}`}><MaterialIcons name={iconFor(item.type)} size={20} color={item.isRead ? '#64748b' : '#2563eb'} /></View>
          <View className="ml-3 flex-1"><View className="flex-row items-start"><Text className="flex-1 font-semibold text-foreground dark:text-foreground-dark">{item.title}</Text><Text className="ml-2 text-xs text-muted dark:text-muted-dark">{relativeTime(item.createdAt)}</Text></View><Text className="mt-1 text-sm text-muted dark:text-muted-dark">{item.message}</Text>{!item.isRead && <Text className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400">Unread · Tap to open</Text>}</View>
        </Pressable>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
