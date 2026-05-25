import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const ACCESS_KEY = 'barbar_at';
const REFRESH_KEY = 'barbar_rt';

export function setTokens(access: string, refresh: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}
export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true, // still send cookies when available (server)
  headers: { 'Content-Type': 'application/json' },
});

// Inject Bearer token on every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<(token?: string) => void> = [];

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve) => pendingQueue.push(() => resolve(api(original))));
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = getRefreshToken();
        const { data } = await api.post('/auth/refresh', refreshToken ? { refreshToken } : undefined);
        if (data?.accessToken && data?.refreshToken) {
          setTokens(data.accessToken, data.refreshToken);
        }
        pendingQueue.forEach((cb) => cb());
        pendingQueue = [];
        return api(original);
      } catch (e) {
        pendingQueue = [];
        clearTokens();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);
