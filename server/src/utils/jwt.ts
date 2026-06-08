import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '../models/index.js';

export interface AccessPayload {
  sub: string; // user id
  role: Role;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  } as SignOptions);
}

export function signRefreshToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessPayload;
}

export function verifyRefreshToken(token: string): AccessPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as AccessPayload;
}
