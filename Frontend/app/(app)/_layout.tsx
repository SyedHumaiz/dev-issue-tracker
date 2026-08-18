import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/useAuthStore';
import { ActivityIndicator, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useRealtimeConnection } from '@/src/hooks/useRealtime';
import { NotificationBell } from '@/src/components/NotificationBell';

export default function AppLayout() {
  const { token, isLoading } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';

  useRealtimeConnection();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-background-dark">
        <ActivityIndicator size="large" color={dark ? '#60a5fa' : '#2563eb'} />
      </View>
    );
  }

  if (!token) {
    return <Redirect href={"/(auth)/login" as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: dark ? '#171718' : '#ffffff',
        },
        headerTintColor: dark ? '#f8fafc' : '#0f172a',
        headerRight: () => <NotificationBell />,
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: dark ? '#0F0F10' : '#f8fafc',
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="projects/[id]" options={{ title: 'Project Details' }} />
      <Stack.Screen name="issues/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="github/repos" options={{ title: 'GitHub Repositories' }} />
      <Stack.Screen name="github/repos/[owner]/[repo]/pulls" options={{ title: 'Open Pull Requests' }} />
    </Stack>
  );
}
