import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { GymConfig } from '../models/index.js';

export const app: Express = createApp();

interface TestUser {
  token: string;
  refreshToken: string;
  id: string;
}

// Registers a user via the real signup endpoint and returns tokens.
export async function makeUser(
  role: 'MEMBER' | 'TRAINER' | 'ADMIN' = 'MEMBER',
  email = `${role.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}@test.app`,
): Promise<TestUser> {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: `${role} User`, email, password: 'password123', role });
  return { token: res.body.accessToken, refreshToken: res.body.refreshToken, id: res.body.user.id };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function setCapacity(capacity: number) {
  await GymConfig.deleteMany({});
  await GymConfig.create({ name: 'Test Gym', capacity });
}
