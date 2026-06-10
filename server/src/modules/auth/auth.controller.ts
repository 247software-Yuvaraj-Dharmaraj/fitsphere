import type { Request, Response } from 'express';
import * as authService from './auth.service.js';
import {
  changePasswordSchema,
  preferencesSchema,
  refreshSchema,
  signinSchema,
  signupSchema,
  updateProfileSchema,
} from './auth.schema.js';

export async function signup(req: Request, res: Response) {
  const input = signupSchema.parse(req.body);
  const result = await authService.signup(input);
  res.status(201).json(result);
}

export async function signin(req: Request, res: Response) {
  const input = signinSchema.parse(req.body);
  const result = await authService.signin(input);
  res.json(result);
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.refresh(refreshToken);
  res.json(result);
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  await authService.logout(refreshToken);
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const result = await authService.getMe(req.user!.id);
  res.json(result);
}

export async function updateProfile(req: Request, res: Response) {
  const input = updateProfileSchema.parse(req.body);
  res.json(await authService.updateProfile(req.user!.id, input));
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.user!.id, currentPassword, newPassword);
  res.status(204).send();
}

export async function updatePreferences(req: Request, res: Response) {
  const prefs = preferencesSchema.parse(req.body);
  const result = await authService.updatePreferences(req.user!.id, prefs);
  res.json(result);
}
