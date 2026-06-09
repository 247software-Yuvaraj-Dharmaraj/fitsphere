import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, makeUser } from './helpers.js';

describe('auth', () => {
  it('signs up and returns tokens + public user (no hash)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Alice', email: 'alice@test.app', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user).toMatchObject({ name: 'Alice', email: 'alice@test.app', role: 'MEMBER' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email with 409', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Alpha', email: 'dup@test.app', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Beta', email: 'dup@test.app', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects invalid signup payload with 400 + field errors', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'bad', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('email');
    expect(res.body.errors).toHaveProperty('password');
  });

  it('signs in with correct credentials, rejects wrong password', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Bob', email: 'bob@test.app', password: 'password123' });
    const ok = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'bob@test.app', password: 'password123' });
    expect(ok.status).toBe(200);
    const bad = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'bob@test.app', password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  it('/me requires a valid token', async () => {
    const noAuth = await request(app).get('/api/auth/me');
    expect(noAuth.status).toBe(401);

    const user = await makeUser('ADMIN');
    const me = await request(app).get('/api/auth/me').set(auth(user.token));
    expect(me.status).toBe(200);
    expect(me.body.role).toBe('ADMIN');
  });

  it('refreshes tokens and rotates the refresh token', async () => {
    const user = await makeUser('MEMBER');
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: user.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    // old refresh token is now revoked
    const reuse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: user.refreshToken });
    expect(reuse.status).toBe(401);
  });
});
