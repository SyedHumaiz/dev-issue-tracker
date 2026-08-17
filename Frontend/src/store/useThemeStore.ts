import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

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
    set({ themeMode });
  },
  hydrateTheme: async () => {
    try {
      const storedMode = await SecureStore.getItemAsync(THEME_KEY);
      set({ themeMode: storedMode === 'light' || storedMode === 'dark' || storedMode === 'system' ? storedMode : 'system', isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },
}));
