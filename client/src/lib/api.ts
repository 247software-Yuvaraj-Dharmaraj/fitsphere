import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { tokenStore } from './tokens';

// Same-origin in dev (Vite proxies /api -> :4001). Override for prod builds.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

// Fired when refresh fails and the session is unrecoverable, so the app can
// redirect to login without coupling axios to the router.
export const onAuthLogout = new EventTarget();

// ---- Request: attach the access token ----
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const access = tokenStore.getAccess();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

// ---- Response: on 401, try a single refresh then replay the request ----
// A shared promise prevents a stampede of refresh calls when several requests
// 401 at once.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) throw new Error('No refresh token');
  // Bare axios (not `api`) to skip the interceptors below.
  const { data } = await axios.post('/api/auth/refresh', { refreshToken });
  tokenStore.set(data.accessToken, data.refreshToken);
  return data.accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthRoute = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const newAccess = await refreshPromise;
        refreshPromise = null;
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshErr) {
        refreshPromise = null;
        tokenStore.clear();
        onAuthLogout.dispatchEvent(new Event('logout'));
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  },
);

// Normalizes server error messages for display.
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message ?? err.message ?? fallback;
  }
  return fallback;
}
