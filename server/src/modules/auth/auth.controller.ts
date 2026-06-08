import type { Request, Response } from 'express';
import * as authService from './auth.service.js';
import { refreshSchema, signinSchema, signupSchema } from './auth.schema.js';

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
