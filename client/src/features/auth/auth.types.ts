export type Role = 'MEMBER' | 'TRAINER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: Role;
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
  role?: Role;
}

export interface SigninPayload {
  email: string;
  password: string;
}
