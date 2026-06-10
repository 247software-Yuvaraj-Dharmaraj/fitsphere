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

  it('lists a member\'s own upcoming bookings', async () => {
    const admin = await makeUser('ADMIN');
    await createSlot(admin.token);
    const list = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(admin.token));
    const slotId = list.body.slots[0].id;

    const member = await makeUser('MEMBER');
    let mine = await request(app).get('/api/slots/my-bookings').set(auth(member.token));
    expect(mine.body).toHaveLength(0);

    await request(app).post(`/api/slots/${slotId}/book`).set(auth(member.token));
    mine = await request(app).get('/api/slots/my-bookings').set(auth(member.token));
    expect(mine.status).toBe(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].bookedByMe).toBe(true);
  });

  it('does not overbook the last seat under concurrent bookings', async () => {
    const admin = await makeUser('ADMIN');
    await createSlot(admin.token, 1); // capacity 1
    const list = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(admin.token));
    const slotId = list.body.slots[0].id;

    const a = await makeUser('MEMBER');
    const b = await makeUser('MEMBER');
    // both race for the single seat at the same time
    const [r1, r2] = await Promise.all([
      request(app).post(`/api/slots/${slotId}/book`).set(auth(a.token)),
      request(app).post(`/api/slots/${slotId}/book`).set(auth(b.token)),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]); // exactly one wins

    const after = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(admin.token));
    expect(after.body.slots[0].bookedCount).toBe(1); // never exceeds capacity
  });

  it('rejects creating a slot in the past', async () => {
    const admin = await makeUser('ADMIN');
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const res = await request(app)
      .post('/api/slots')
      .set(auth(admin.token))
      .send({ date: yesterday.toISOString().slice(0, 10), startTime: '06:00', endTime: '07:00', capacity: 5 });
    expect(res.status).toBe(409);
  });

  it('admin can edit a slot; members cannot', async () => {
    const admin = await makeUser('ADMIN');
    await createSlot(admin.token, 5);
    const list = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(admin.token));
    const slotId = list.body.slots[0].id;

    const member = await makeUser('MEMBER');
    const denied = await request(app)
      .patch(`/api/slots/${slotId}`)
      .set(auth(member.token))
      .send({ startTime: '08:00', endTime: '09:00', capacity: 10 });
    expect(denied.status).toBe(403);

    const edited = await request(app)
      .patch(`/api/slots/${slotId}`)
      .set(auth(admin.token))
      .send({ startTime: '08:00', endTime: '09:00', capacity: 10 });
    expect(edited.status).toBe(200);
    expect(edited.body.startTime).toBe('08:00');
    expect(edited.body.capacity).toBe(10);
  });

  it('rejects booking a slot on a past date', async () => {
    const { Slot } = await import('../models/index.js');
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);
    const pastSlot = await Slot.create({
      date: yesterday,
      startTime: '06:00',
      endTime: '07:00',
      capacity: 10,
      bookings: [],
    });

    const member = await makeUser('MEMBER');
    const res = await request(app)
      .post(`/api/slots/${pastSlot._id}/book`)
      .set(auth(member.token));
    expect(res.status).toBe(409);
  });

  it('rejects overlapping / duplicate slots on the same day', async () => {
    const admin = await makeUser('ADMIN');
    const first = await createSlot(admin.token); // 06:00–07:00
    expect(first.status).toBe(201);

    // exact duplicate
    const dup = await createSlot(admin.token);
    expect(dup.status).toBe(409);

    // partial overlap (06:23–07:00)
    const overlap = await request(app)
      .post('/api/slots')
      .set(auth(admin.token))
      .send({ date: TODAY, startTime: '06:23', endTime: '07:00', capacity: 5 });
    expect(overlap.status).toBe(409);

    // adjacent, non-overlapping (07:00–08:00) is allowed
    const ok = await request(app)
      .post('/api/slots')
      .set(auth(admin.token))
      .send({ date: TODAY, startTime: '07:00', endTime: '08:00', capacity: 5 });
    expect(ok.status).toBe(201);
  });

  it('rejects shrinking capacity below current bookings', async () => {
    const admin = await makeUser('ADMIN');
    await createSlot(admin.token, 2); // capacity 2
    const list = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(admin.token));
    const slotId = list.body.slots[0].id;

    const m1 = await makeUser('MEMBER');
    const m2 = await makeUser('MEMBER');
    await request(app).post(`/api/slots/${slotId}/book`).set(auth(m1.token));
    await request(app).post(`/api/slots/${slotId}/book`).set(auth(m2.token));

    // 2 booked → can't drop capacity to 1
    const tooLow = await request(app)
      .patch(`/api/slots/${slotId}`)
      .set(auth(admin.token))
      .send({ startTime: '06:00', endTime: '07:00', capacity: 1 });
    expect(tooLow.status).toBe(409);
  });

  it('waitlists a member on a full slot and auto-promotes them on cancellation', async () => {
    const admin = await makeUser('ADMIN');
    await createSlot(admin.token, 1); // capacity 1
    const list = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(admin.token));
    const slotId = list.body.slots[0].id;

    const m1 = await makeUser('MEMBER');
    const m2 = await makeUser('MEMBER');

    // m1 takes the only seat
    await request(app).post(`/api/slots/${slotId}/book`).set(auth(m1.token));

    // m2 can't book a full slot, but can join the waitlist
    const cantBook = await request(app).post(`/api/slots/${slotId}/book`).set(auth(m2.token));
    expect(cantBook.status).toBe(409);

    const joined = await request(app).post(`/api/slots/${slotId}/waitlist`).set(auth(m2.token));
    expect(joined.status).toBe(200);
    expect(joined.body.waitlistedByMe).toBe(true);
    expect(joined.body.waitlistPosition).toBe(1);

    // can't join twice
    const dup = await request(app).post(`/api/slots/${slotId}/waitlist`).set(auth(m2.token));
    expect(dup.status).toBe(409);

    // m1 cancels → m2 is auto-promoted into the seat
    await request(app).delete(`/api/slots/${slotId}/book`).set(auth(m1.token));

    const after = await request(app).get('/api/slots/my-bookings').set(auth(m2.token));
    expect(after.body).toHaveLength(1);
    expect(after.body[0].bookedByMe).toBe(true);
    expect(after.body[0].waitlistedByMe).toBe(false);
  });

  it('rejects joining the waitlist when the slot still has space', async () => {
    const admin = await makeUser('ADMIN');
    await createSlot(admin.token, 5); // plenty of room
    const list = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(admin.token));
    const slotId = list.body.slots[0].id;

    const member = await makeUser('MEMBER');
    const res = await request(app).post(`/api/slots/${slotId}/waitlist`).set(auth(member.token));
    expect(res.status).toBe(409);
  });

  it('lets a member leave the waitlist', async () => {
    const admin = await makeUser('ADMIN');
    await createSlot(admin.token, 1);
    const list = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(admin.token));
    const slotId = list.body.slots[0].id;

    const m1 = await makeUser('MEMBER');
    const m2 = await makeUser('MEMBER');
    await request(app).post(`/api/slots/${slotId}/book`).set(auth(m1.token));
    await request(app).post(`/api/slots/${slotId}/waitlist`).set(auth(m2.token));

    const left = await request(app).delete(`/api/slots/${slotId}/waitlist`).set(auth(m2.token));
    expect(left.status).toBe(200);
    expect(left.body.waitlistCount).toBe(0);

    // leaving when not on the waitlist is a 400
    const again = await request(app).delete(`/api/slots/${slotId}/waitlist`).set(auth(m2.token));
    expect(again.status).toBe(400);

    // m1 cancels — nobody to promote, seat just frees
    await request(app).delete(`/api/slots/${slotId}/book`).set(auth(m1.token));
    const fresh = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(admin.token));
    expect(fresh.body.slots[0].bookedCount).toBe(0);
  });

  it('promotes from the waitlist when capacity is increased', async () => {
    const admin = await makeUser('ADMIN');
    await createSlot(admin.token, 1);
    const list = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(admin.token));
    const slotId = list.body.slots[0].id;

    const m1 = await makeUser('MEMBER');
    const m2 = await makeUser('MEMBER');
    await request(app).post(`/api/slots/${slotId}/book`).set(auth(m1.token));
    await request(app).post(`/api/slots/${slotId}/waitlist`).set(auth(m2.token));

    // admin raises capacity to 2 → m2 should be pulled in
    const edited = await request(app)
      .patch(`/api/slots/${slotId}`)
      .set(auth(admin.token))
      .send({ startTime: '06:00', endTime: '07:00', capacity: 2 });
    expect(edited.status).toBe(200);
    expect(edited.body.bookedCount).toBe(2);
    expect(edited.body.waitlistCount).toBe(0);
  });

  it('admin can bulk-delete slots', async () => {
    const admin = await makeUser('ADMIN');
    await createSlot(admin.token);
    await createSlot(admin.token);
    const list = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(admin.token));
    const ids = list.body.slots.map((s: { id: string }) => s.id);

    const res = await request(app)
      .post('/api/slots/bulk-delete')
      .set(auth(admin.token))
      .send({ ids });
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(ids.length);

    const after = await request(app).get(`/api/slots?date=${TODAY}`).set(auth(admin.token));
    expect(after.body.slots).toHaveLength(0);
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

  it('members directory can be filtered by status', async () => {
    const admin = await makeUser('ADMIN');
    await makeUser('MEMBER', 'aaa@test.app');
    await makeUser('MEMBER', 'bbb@test.app');

    // members who have never checked in are INACTIVE
    const inactive = await request(app)
      .get('/api/analytics/members?status=INACTIVE')
      .set(auth(admin.token));
    expect(inactive.status).toBe(200);
    expect(inactive.body.total).toBe(2);
    expect(inactive.body.rows.every((r: { status: string }) => r.status === 'INACTIVE')).toBe(true);

    // none are ACTIVE
    const active = await request(app)
      .get('/api/analytics/members?status=ACTIVE')
      .set(auth(admin.token));
    expect(active.body.total).toBe(0);
    expect(active.body.rows).toHaveLength(0);
  });
});
