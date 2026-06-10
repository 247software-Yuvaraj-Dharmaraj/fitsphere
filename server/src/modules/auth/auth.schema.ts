import { z } from 'zod';

// Public signup always creates a MEMBER — roles are NOT self-assignable.
// Trainer/Admin accounts are provisioned by seeding / invite only.
export const signupSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Invalid email'),
  mobile: z.string().min(7).max(15).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signinSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const preferencesSchema = z
  .object({
    theme: z.enum(['light', 'dark']).optional(),
    density: z.enum(['comfortable', 'compact']).optional(),
    locale: z.string().min(2).max(5).optional(),
  })
  .refine((d) => d.theme || d.density || d.locale, {
    message: 'At least one preference is required',
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
