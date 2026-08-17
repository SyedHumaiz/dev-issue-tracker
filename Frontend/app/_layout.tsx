import { Slot } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colorScheme, useColorScheme } from 'nativewind';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useThemeStore } from '@/src/store/useThemeStore';
import '../global.css';

const queryClient = new QueryClient();

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrateTheme = useThemeStore((state) => state.hydrateTheme);
  const themeMode = useThemeStore((state) => state.themeMode);
  const isThemeHydrated = useThemeStore((state) => state.isHydrated);
  const { colorScheme: resolvedScheme } = useColorScheme();

  useEffect(() => {
    hydrate();
    hydrateTheme();
  }, [hydrate, hydrateTheme]);

  useEffect(() => {
    if (isThemeHydrated) colorScheme.set(themeMode);
  }, [isThemeHydrated, themeMode]);

  if (!isThemeHydrated) return <View className="flex-1 bg-background dark:bg-background-dark" />;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <Slot />
    </QueryClientProvider>
  );
}
