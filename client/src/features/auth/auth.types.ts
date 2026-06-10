export type Role = 'MEMBER' | 'TRAINER' | 'ADMIN';

export interface UserPreferences {
  theme: 'light' | 'dark';
  density: 'comfortable' | 'compact';
  locale: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: Role;
  preferences: UserPreferences;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  mobile?: string;
  password: string;
}

export interface SigninPayload {
  email: string;
  password: string;
}
