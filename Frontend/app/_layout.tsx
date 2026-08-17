import { Slot } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colorScheme, useColorScheme } from 'nativewind';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme as NavDarkTheme, DefaultTheme as NavLightTheme, ThemeProvider } from '@react-navigation/native';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useThemeStore } from '@/src/store/useThemeStore';
import '../global.css';

const queryClient = new QueryClient();

const CustomDarkTheme = {
  ...NavDarkTheme,
  colors: {
    ...NavDarkTheme.colors,
    background: '#111827',
    card: '#1f2937',
    text: '#f8fafc',
    border: '#334155',
    primary: '#60a5fa',
  },
};

const CustomLightTheme = {
  ...NavLightTheme,
  colors: {
    ...NavLightTheme.colors,
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    border: '#e2e8f0',
    primary: '#2563eb',
  },
};

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

  const isDark = resolvedScheme === 'dark';

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={isDark ? CustomDarkTheme : CustomLightTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Slot />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

