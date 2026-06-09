import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, makeUser, setCapacity } from './helpers.js';

describe('attendance', () => {
  it('check-in then check-out, with guards', async () => {
    const u = await makeUser('MEMBER');

    const inRes = await request(app).post('/api/attendance/check-in').set(auth(u.token));
    expect(inRes.status).toBe(201);
    expect(inRes.body.checkOutAt).toBeNull();

    // double check-in blocked
    const dup = await request(app).post('/api/attendance/check-in').set(auth(u.token));
    expect(dup.status).toBe(409);

    const outRes = await request(app).post('/api/attendance/check-out').set(auth(u.token));
    expect(outRes.status).toBe(200);
    expect(outRes.body.checkOutAt).toBeTruthy();

    // check-out with no open session blocked
    const noOpen = await request(app).post('/api/attendance/check-out').set(auth(u.token));
    expect(noOpen.status).toBe(400);
  });

  it('summary reflects streak and live occupancy', async () => {
    const u = await makeUser('MEMBER');
    await request(app).post('/api/attendance/check-in').set(auth(u.token));

    const res = await request(app).get('/api/attendance/summary').set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.checkedIn).toBe(true);
    expect(res.body.streak).toBe(1);
    expect(res.body.occupancy.activeCount).toBe(1);
    expect(res.body.occupancy.level).toBe('LOW');
  });

  it('blocks check-in when the gym is at full capacity', async () => {
    await setCapacity(1);
    const a = await makeUser('MEMBER');
    const b = await makeUser('MEMBER');

    const first = await request(app).post('/api/attendance/check-in').set(auth(a.token));
    expect(first.status).toBe(201); // occupancy now 1/1 = FULL

    const second = await request(app).post('/api/attendance/check-in').set(auth(b.token));
    expect(second.status).toBe(409);
  });
});
