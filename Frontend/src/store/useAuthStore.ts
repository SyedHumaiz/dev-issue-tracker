import { create } from 'zustand';
import { User } from '@/src/types';
import { saveToken, getToken, deleteToken } from '@/src/utils/storage';
import { apiClient } from '@/src/api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (token: string, user: User) => {
    await saveToken(token);
    set({ token, user, isLoading: false });
  },

  logout: async () => {
    await deleteToken();
    set({ token: null, user: null, isLoading: false });
  },

  hydrate: async () => {
    try {
      const token = await getToken();
      if (!token) {
        set({ isLoading: false });
        return;
      }
      // Temporarily set the token so the Axios interceptor can use it
      set({ token });
      // Validate the token by calling GET /auth/me
      const res = await apiClient.get<User>('/auth/me');
      set({ user: res.data, token, isLoading: false });
    } catch {
      // Token is invalid or expired — clear everything
      await deleteToken();
      set({ token: null, user: null, isLoading: false });
    }
  },
}));
