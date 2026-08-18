import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useUnreadNotificationCount } from '@/src/api/hooks';

export function NotificationBell() {
  const router = useRouter();
  const { data } = useUnreadNotificationCount();
  const count = data?.count ?? 0;

  return (
    <Pressable onPress={() => router.push('/(app)/notifications' as any)} className="mr-3 h-10 w-10 items-center justify-center">
      <MaterialIcons name="notifications-none" size={24} color="#60a5fa" />
      {count > 0 && <View className="absolute right-0 top-0 min-w-[18px] items-center rounded-full bg-blue-600 px-1"><Text className="text-[10px] font-bold text-white">{count > 99 ? '99+' : count}</Text></View>}
    </Pressable>
  );
}
