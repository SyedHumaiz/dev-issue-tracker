import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';

export default function GithubConnectedScreen() {
  useEffect(() => {
    router.replace('/(app)/(tabs)/profile' as any);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
