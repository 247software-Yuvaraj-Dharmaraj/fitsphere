// TEMP — rich demo dataset for recruiter-facing demos.
//
// Seeds a full member roster with backdated attendance, the demo member's streak/workouts/
// bookings/feedback, a week of slots with realistic bookings, and cross-member activity for the
// admin analytics. Exposed as seedDatabase() so the server can self-heal the demo on boot
// (see src/index.ts); also runnable standalone with `npm run seed`. Revert this commit to
// restore the minimal seed.
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from './lib/db.js';
import { Attendance, Feedback, GymConfig, RefreshToken, Slot, User, WorkoutLog } from './models/index.js';

const DEMO_PASSWORD = 'password123';

const ROSTER: [string, string][] = [
  ['Marcus Lee', 'marcus.lee@fitsphere.app'],
  ['Priya Nair', 'priya.nair@fitsphere.app'],
  ['Diego Santos', 'diego.santos@fitsphere.app'],
  ['Sara Kim', 'sara.kim@fitsphere.app'],
  ['Tom Becker', 'tom.becker@fitsphere.app'],
  ['Lena Park', 'lena.park@fitsphere.app'],
  ['Omar Farah', 'omar.farah@fitsphere.app'],
  ['Nina Patel', 'nina.patel@fitsphere.app'],
  ['Jack Ryan', 'jack.ryan@fitsphere.app'],
  ['Mei Chen', 'mei.chen@fitsphere.app'],
  ['Ravi Kumar', 'ravi.kumar@fitsphere.app'],
];

const DAY = 86_400_000;
const startOfDayUTC = (): Date => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};
const startOfWeekUTC = (): Date => {
  const d = startOfDayUTC();
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
};
const addDays = (d: Date, days: number): Date => new Date(d.getTime() + days * DAY);
const addHours = (d: Date, h: number): Date => new Date(d.getTime() + h * 3_600_000);
const addMinutes = (d: Date, m: number): Date => new Date(d.getTime() + m * 60_000);
const rint = (n: number): number => Math.floor(Math.random() * n);
const hh = (h: number): string => `${String(h).padStart(2, '0')}:00`;

/** Wipes demo collections and reseeds the rich dataset. Assumes the DB is already connected. */
export async function seedDatabase(): Promise<void> {
  await Promise.all([
    User.deleteMany({}),
    GymConfig.deleteMany({}),
    Slot.deleteMany({}),
    Feedback.deleteMany({}),
    Attendance.deleteMany({}),
    WorkoutLog.deleteMany({}),
    RefreshToken.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const member = await User.create({ name: 'Alice Member', email: 'member@fitsphere.app', role: 'MEMBER', passwordHash });
  const trainer = await User.create({ name: 'Tina Trainer', email: 'trainer@fitsphere.app', role: 'TRAINER', passwordHash });
  await User.create({ name: 'Adam Admin', email: 'admin@fitsphere.app', role: 'ADMIN', passwordHash });

  const members = [member];
  for (const [name, email] of ROSTER) {
    members.push(await User.create({ name, email, role: 'MEMBER', passwordHash }));
  }

  await GymConfig.create({ name: 'FitSphere Gym', capacity: 50 });

  const base = startOfDayUTC();
  const attendance: Record<string, unknown>[] = [];

  // Demo member: 11 consecutive days ending today (today open) → strong current streak.
  for (let d = 10; d >= 0; d--) {
    const checkInAt = addHours(addDays(base, -d), d % 2 === 0 ? 7 : 18);
    const rec: Record<string, unknown> = { user: member._id, checkInAt };
    if (d > 0) rec.checkOutAt = addMinutes(checkInAt, 45 + rint(60));
    attendance.push(rec);
  }
  // Older visits earlier in the month for weekly/monthly totals.
  for (const d of [13, 15, 17, 19, 22, 24, 27]) {
    const checkInAt = addHours(addDays(base, -d), d % 2 === 0 ? 8 : 19);
    attendance.push({ user: member._id, checkInAt, checkOutAt: addMinutes(checkInAt, 45 + rint(60)) });
  }

  // Demo member: ~24 workouts across types over the last month.
  const types = ['CARDIO', 'STRENGTH', 'MIXED'] as const;
  const workouts: Record<string, unknown>[] = [];
  for (let i = 0; i < 24; i++) {
    workouts.push({ user: member._id, type: types[i % 3], durationMin: 30 + (i % 5) * 10, date: addHours(addDays(base, -(i + 1)), 7 + (i % 12)) });
  }

  // The rest of the roster: varied attendance for analytics + the member directory.
  const peak = [6, 7, 7, 8, 8, 9, 12, 17, 18, 18, 19, 19, 20];
  for (let m = 1; m < members.length; m++) {
    const inactive = m % 7 === 0;
    const visits = inactive ? 2 + rint(3) : 8 + rint(14);
    const oldest = inactive ? 40 : 26;
    for (let v = 0; v < visits; v++) {
      const daysAgo = inactive ? 18 + rint(oldest - 18) : rint(oldest);
      const checkInAt = addHours(addDays(base, -daysAgo), peak[rint(peak.length)]);
      attendance.push({ user: members[m]._id, checkInAt, checkOutAt: addMinutes(checkInAt, 40 + rint(70)) });
    }
  }
  // A handful currently checked-in (open) today so live occupancy is non-trivial.
  for (let m = 2; m <= 7; m++) {
    attendance.push({ user: members[m]._id, checkInAt: addHours(base, 8 + rint(3)) });
  }

  await Attendance.insertMany(attendance);
  await WorkoutLog.insertMany(workouts);

  // Slots: a full week ahead with realistic bookings + a waitlist.
  const memberIds = members.map((u) => u._id);
  // Fill random bookings from everyone EXCEPT the demo member, so her "My Bookings" reflects
  // only the slots we book her into explicitly (below) rather than every slot.
  const fillPool = memberIds.filter((id) => String(id) !== String(member._id));
  const times: [number, number, number][] = [[6, 7, 15], [7, 8, 20], [12, 13, 12], [17, 18, 20], [18, 19, 25], [19, 20, 20]];
  const slots: Record<string, unknown>[] = [];
  for (let d = 0; d < 7; d++) {
    const date = addDays(base, d);
    for (const [sh, eh, cap] of times) {
      const fill = Math.min(cap, rint(Math.floor(cap / 2) + 1) + Math.floor(cap / 3));
      const shuffled = [...fillPool].sort(() => Math.random() - 0.5);
      slots.push({ date, startTime: hh(sh), endTime: hh(eh), capacity: cap, bookings: shuffled.slice(0, fill), waitlist: [] });
    }
  }
  // Demo member booked into two upcoming slots.
  slots.push({ date: addDays(base, 1), startTime: '07:00', endTime: '08:00', capacity: 20, bookings: [member._id], waitlist: [] });
  slots.push({ date: addDays(base, 2), startTime: '18:00', endTime: '19:00', capacity: 25, bookings: [member._id], waitlist: [] });
  // A full slot tomorrow with the demo member on the waitlist.
  const others = memberIds.filter((id) => String(id) !== String(member._id)).sort(() => Math.random() - 0.5);
  slots.push({ date: addDays(base, 1), startTime: '12:00', endTime: '13:00', capacity: 2, bookings: [others[0], others[1]], waitlist: [member._id] });
  await Slot.insertMany(slots);

  // Feedback: trainer notes to the demo member + a few others.
  const week = startOfWeekUTC();
  await Feedback.insertMany([
    { trainer: trainer._id, member: member._id, note: 'Great consistency this week — keep the cardio sessions going!', weekOf: week },
    { trainer: trainer._id, member: member._id, note: 'Nice progress on strength. Add one mobility session next week.', weekOf: addDays(week, -7) },
    { trainer: trainer._id, member: member._id, note: 'Strong streak! Watch your recovery on back-to-back days.', weekOf: addDays(week, -14) },
    { trainer: trainer._id, member: members[1]._id, note: "Welcome back — let's rebuild the routine gradually.", weekOf: week },
    { trainer: trainer._id, member: members[2]._id, note: 'Excellent form in the strength circuit today.', weekOf: week },
    { trainer: trainer._id, member: members[3]._id, note: 'Try the 7am slot — it fits your schedule better.', weekOf: addDays(week, -7) },
  ]);

  console.log(
    `[seed] done. ${members.length} members, ${attendance.length} attendance, ${workouts.length} workouts, ${slots.length} slots.`,
  );
  console.log('[seed] demo accounts (password: %s): member@ / trainer@ / admin@fitsphere.app', DEMO_PASSWORD);
}

// Standalone runner: `npm run seed`.
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  (async () => {
    await connectDb();
    await seedDatabase();
    await disconnectDb();
  })().catch((err) => {
    console.error('[seed] failed', err);
    process.exit(1);
  });
}
