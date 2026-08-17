import { create } from 'zustand';
import { User } from '@/src/types';
import { saveToken, getToken, deleteToken } from '@/src/utils/storage';
import { apiClient } from '@/src/api/client';
import { setAccessToken, setUnauthorizedHandler } from '@/src/api/session';
import { socketService } from '@/src/api/socket';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  setUser: (user: User) => set({ user }),

  login: async (token: string, user: User) => {
    await saveToken(token);
    setAccessToken(token);
    set({ token, user, isLoading: false });
  },

  logout: async () => {
    socketService.disconnect();
    await deleteToken();
    setAccessToken(null);
    set({ token: null, user: null, isLoading: false });
  },

  hydrate: async () => {
    try {
      const token = await getToken();
      if (!token) {
        setAccessToken(null);
        set({ isLoading: false });
        return;
      }
      // Temporarily set the token so the Axios interceptor can use it
      set({ token });
      setAccessToken(token);
      // Validate the token by calling GET /auth/me
      const res = await apiClient.get<User>('/auth/me');
      set({ user: res.data, token, isLoading: false });
    } catch {
      // Token is invalid or expired — clear everything
      await deleteToken();
      setAccessToken(null);
      set({ token: null, user: null, isLoading: false });
    }
  },
}));

setUnauthorizedHandler(async () => {
  if (useAuthStore.getState().token) await useAuthStore.getState().logout();
});
