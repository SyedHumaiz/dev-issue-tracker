import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/useAuthStore';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (token) {
    return <Redirect href={"/(app)/(tabs)/projects" as any} />;
  }

  return <Redirect href={"/(auth)/login" as any} />;
}
