import axios from 'axios';
import { useAuthStore } from '@/src/store/useAuthStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
console.log("API URL:", process.env.EXPO_PUBLIC_API_URL);

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token from Zustand
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired — force logout
      const { token } = useAuthStore.getState();
      if (token) {
        await useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);
