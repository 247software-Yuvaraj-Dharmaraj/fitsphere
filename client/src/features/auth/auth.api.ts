import { api } from '../../lib/api';
import { tokenStore } from '../../lib/tokens';
import type {
  AuthResponse,
  SigninPayload,
  SignupPayload,
  User,
  UserPreferences,
} from './auth.types';

export async function signin(payload: SigninPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/signin', payload);
  tokenStore.set(data.accessToken, data.refreshToken);
  return data;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/signup', payload);
  tokenStore.set(data.accessToken, data.refreshToken);
  return data;
}

export async function fetchMe(signal?: AbortSignal): Promise<User> {
  const { data } = await api.get<User>('/auth/me', { signal });
  return data;
}

export async function updatePreferences(prefs: Partial<UserPreferences>): Promise<User> {
  const { data } = await api.patch<User>('/auth/me/preferences', prefs);
  return data;
}

export async function updateProfile(input: { name?: string; mobile?: string }): Promise<User> {
  const { data } = await api.patch<User>('/auth/me', input);
  return data;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await api.post('/auth/me/password', input);
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStore.getRefresh();
  try {
    if (refreshToken) await api.post('/auth/logout', { refreshToken });
  } finally {
    tokenStore.clear();
  }
}
