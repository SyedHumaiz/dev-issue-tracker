import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { colorScheme } from 'nativewind';

export type ThemeMode = 'system' | 'light' | 'dark';
const THEME_KEY = 'theme_mode';

interface ThemeState {
  themeMode: ThemeMode;
  isHydrated: boolean;
  setThemeMode: (themeMode: ThemeMode) => Promise<void>;
  hydrateTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'system',
  isHydrated: false,
  setThemeMode: async (themeMode) => {
    await SecureStore.setItemAsync(THEME_KEY, themeMode);
    colorScheme.set(themeMode);
    set({ themeMode });
  },
  hydrateTheme: async () => {
    try {
      const storedMode = await SecureStore.getItemAsync(THEME_KEY);
      const themeMode = storedMode === 'light' || storedMode === 'dark' || storedMode === 'system' ? storedMode : 'system';
      colorScheme.set(themeMode);
      set({ themeMode, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },
}));
