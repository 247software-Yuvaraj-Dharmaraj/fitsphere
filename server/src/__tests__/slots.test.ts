import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, makeUser } from './helpers.js';

const TODAY = new Date().toISOString().slice(0, 10);

async function createSlot(token: string, capacity = 2) {
  return request(app)
    .post('/api/slots')
    .set(auth(token))
    .send({ date: TODAY, startTime: '06:00', endTime: '07:00', capacity });
}

describe('slots', () => {
  it('only admin/trainer can create slots', async () => {
    const member = await makeUser('MEMBER');
    const admin = await makeUser('ADMIN');

    const denied = await createSlot(member.token);
    expect(denied.status).toBe(403);

    const ok = await createSlot(admin.token);
    expect(ok.status).toBe(201);
  });

  it('member can book and cancel; no double-booking; capacity enforced', async () => {
    const admin = await makeUser('ADMIN');
    await createSlot(admin.token, 1);

    const member = await makeUser('MEMBER');
    const list = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(member.token));
    const slotId = list.body.slots[0].id;

    const booked = await request(app).post(`/api/slots/${slotId}/book`).set(auth(member.token));
    expect(booked.status).toBe(200);
    expect(booked.body.bookedByMe).toBe(true);

    const dup = await request(app).post(`/api/slots/${slotId}/book`).set(auth(member.token));
    expect(dup.status).toBe(409);

    // second member can't book a full (capacity 1) slot
    const other = await makeUser('MEMBER');
    const full = await request(app).post(`/api/slots/${slotId}/book`).set(auth(other.token));
    expect(full.status).toBe(409);

    const cancelled = await request(app).delete(`/api/slots/${slotId}/book`).set(auth(member.token));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.bookedByMe).toBe(false);
  });
});

describe('analytics', () => {
  it('is gated to admin/trainer', async () => {
    const member = await makeUser('MEMBER');
    const admin = await makeUser('ADMIN');

    const denied = await request(app).get('/api/analytics/overview').set(auth(member.token));
    expect(denied.status).toBe(403);

    const ok = await request(app).get('/api/analytics/overview').set(auth(admin.token));
    expect(ok.status).toBe(200);
    expect(ok.body.peakHours).toHaveLength(24);
  });

  it('members directory is paginated, searchable, and sorted server-side', async () => {
    const admin = await makeUser('ADMIN');
    await makeUser('MEMBER', 'aaa@test.app');
    await makeUser('MEMBER', 'bbb@test.app');
    await makeUser('MEMBER', 'ccc@test.app');

    const page = await request(app)
      .get('/api/analytics/members?page=0&pageSize=2&sort=name&dir=asc')
      .set(auth(admin.token));
    expect(page.status).toBe(200);
    expect(page.body.total).toBe(3);
    expect(page.body.rows).toHaveLength(2); // pageSize honored

    const search = await request(app)
      .get('/api/analytics/members?q=bbb')
      .set(auth(admin.token));
    expect(search.body.total).toBe(1);
    expect(search.body.rows[0].email).toBe('bbb@test.app');
    expect(search.body.rows[0].status).toBe('INACTIVE'); // never checked in
  });
});
