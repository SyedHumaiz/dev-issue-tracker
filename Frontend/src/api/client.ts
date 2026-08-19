import axios from 'axios';
import { getAccessToken, handleUnauthorized } from '@/src/api/session';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const BASE_URL = configuredBaseUrl && /^https?:\/\//i.test(configuredBaseUrl)
  ? configuredBaseUrl.replace(/\/+$/, '')
  : 'http://localhost:3000';

console.log('[API base URL]', BASE_URL);

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token from Zustand
apiClient.interceptors.request.use((config) => {
  // Temporary network diagnostics: this is the final URL Axios will request.
  console.log('[API request]', {
    method: config.method?.toUpperCase(),
    url: apiClient.getUri(config),
  });
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.config) {
      console.log('[API request failed]', {
        method: error.config.method?.toUpperCase(),
        url: apiClient.getUri(error.config),
        status: error.response?.status,
      });
    }
    if (error.response?.status === 401) {
      // Token is invalid or expired — force logout
      await handleUnauthorized();
    }
    return Promise.reject(error);
  },
);
