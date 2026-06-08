import { z } from 'zod';
import { ROLES } from '../../models/index.js';

export const signupSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Invalid email'),
  mobile: z.string().min(7).max(15).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  // Allow choosing a role at signup for the demo; defaults to MEMBER.
  role: z.enum(ROLES).optional(),
});

export const signinSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
