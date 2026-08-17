import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/useAuthStore';
import { ActivityIndicator, View } from 'react-native';

export default function AuthLayout() {
  const { token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-background-dark">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (token) {
    return <Redirect href={"/(app)/(tabs)/projects" as any} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
