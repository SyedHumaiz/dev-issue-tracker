import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/useAuthStore';
import { ActivityIndicator, View } from 'react-native';

export default function AppLayout() {
  const { token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!token) {
    return <Redirect href={"/(auth)/login" as any} />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="projects/[id]" options={{ title: 'Project Details' }} />
      <Stack.Screen name="issues/[id]" options={{ title: 'Issue Details' }} />
    </Stack>
  );
}
