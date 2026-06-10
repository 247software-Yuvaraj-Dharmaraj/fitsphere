import request from 'supertest';
import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { GymConfig, User } from '../models/index.js';

export const app: Express = createApp();

interface TestUser {
  token: string;
  refreshToken: string;
  id: string;
}

// MEMBER → real signup endpoint. TRAINER/ADMIN → created directly (signup no
// longer assigns roles), then signed in so the token carries the right role.
export async function makeUser(
  role: 'MEMBER' | 'TRAINER' | 'ADMIN' = 'MEMBER',
  email = `${role.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}@test.app`,
): Promise<TestUser> {
  if (role === 'MEMBER') {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Member User', email, password: 'password123' });
    return { token: res.body.accessToken, refreshToken: res.body.refreshToken, id: res.body.user.id };
  }

  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await User.create({ name: `${role} User`, email, passwordHash, role });
  const res = await request(app)
    .post('/api/auth/signin')
    .send({ email, password: 'password123' });
  return {
    token: res.body.accessToken,
    refreshToken: res.body.refreshToken,
    id: String(user._id),
  };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function setCapacity(capacity: number) {
  await GymConfig.deleteMany({});
  await GymConfig.create({ name: 'Test Gym', capacity });
}
