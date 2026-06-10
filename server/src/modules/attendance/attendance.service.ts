import { Attendance, GymConfig } from '../../models/index.js';
import { HttpError } from '../../middleware/error.js';
import { emitOccupancy } from '../../lib/realtime.js';

// ---- date helpers (UTC day buckets keep streak math timezone-stable) ----
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function startOfWeek(now: Date): Date {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 = Sun
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
function startOfDay(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function getCapacity(): Promise<number> {
  const config = await GymConfig.findOne();
  return config?.capacity ?? 50;
}

// Live occupancy = members checked in TODAY without checking out. Restricting to
// today prevents stale sessions (someone who forgot to check out yesterday) from
// inflating occupancy forever.
export async function getOccupancy() {
  const [activeCount, capacity] = await Promise.all([
    Attendance.countDocuments({ checkOutAt: null, checkInAt: { $gte: startOfDay() } }),
    getCapacity(),
  ]);
  const percent = capacity > 0 ? Math.round((activeCount / capacity) * 100) : 0;
  let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'FULL';
  if (percent >= 100) level = 'FULL';
  else if (percent > 75) level = 'HIGH';
  else if (percent > 40) level = 'MEDIUM';
  else level = 'LOW';
  return { activeCount, capacity, percent, level };
}

export async function checkIn(userId: string) {
  const today = startOfDay();
  const open = await Attendance.findOne({ user: userId, checkOutAt: null });
  if (open) {
    if (open.checkInAt >= today) throw new HttpError(409, 'You are already checked in');
    // Forgot to check out on an earlier day — auto-close that stale session.
    open.checkOutAt = today;
    await open.save();
  }

  // Spec rule: new check-ins are disabled at full capacity.
  const occupancy = await getOccupancy();
  if (occupancy.level === 'FULL') {
    throw new HttpError(409, 'The gym is at full capacity. Please try again later.');
  }

  const record = await Attendance.create({ user: userId, checkInAt: new Date() });
  emitOccupancy(await getOccupancy()); // push live update to all clients
  return record;
}

export async function checkOut(userId: string) {
  const open = await Attendance.findOne({ user: userId, checkOutAt: null });
  if (!open) throw new HttpError(400, 'You are not currently checked in');
  open.checkOutAt = new Date();
  await open.save();
  emitOccupancy(await getOccupancy()); // push live update to all clients
  return open;
}

// Consecutive-day streak ending today (or yesterday — still "active" today).
function computeStreak(dayKeys: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!dayKeys.has(dayKey(cursor))) {
    // not in yet today — allow the streak to count up to yesterday
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!dayKeys.has(dayKey(cursor))) return 0;
  }
  while (dayKeys.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function getSummary(userId: string) {
  const now = new Date();
  const [open, all, occupancy] = await Promise.all([
    Attendance.findOne({ user: userId, checkOutAt: null }),
    Attendance.find({ user: userId }).select('checkInAt').lean(),
    getOccupancy(),
  ]);

  const dayKeys = new Set(all.map((a) => dayKey(new Date(a.checkInAt as Date))));
  const streak = computeStreak(dayKeys);

  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const thisWeek = [...dayKeys].filter((k) => new Date(k) >= weekStart).length;
  const thisMonth = [...dayKeys].filter((k) => new Date(k) >= monthStart).length;

  // Only count an open session as "checked in" if it started today.
  const checkedInToday = Boolean(open) && (open!.checkInAt as Date) >= startOfDay(now);

  return {
    checkedIn: checkedInToday,
    since: checkedInToday ? (open!.checkInAt ?? null) : null,
    streak,
    milestones: { 3: streak >= 3, 7: streak >= 7, 14: streak >= 14 },
    totals: { thisWeek, thisMonth, allTime: dayKeys.size },
    occupancy,
  };
}

// Last `days` days as a present/absent series, plus a consistency score
// (% of days attended over the window). Powers the member dashboard.
export async function getTrend(userId: string, days: number) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const records = await Attendance.find({
    user: userId,
    checkInAt: { $gte: since },
  })
    .select('checkInAt')
    .lean();
  const present = new Set(records.map((r) => dayKey(new Date(r.checkInAt as Date))));

  const series: { day: string; present: number }[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < days; i++) {
    const key = dayKey(cursor);
    series.push({ day: key, present: present.has(key) ? 1 : 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const attendedDays = series.filter((s) => s.present).length;
  const consistency = Math.round((attendedDays / days) * 100);
  return { days, series, attendedDays, consistency };
}

// Suggests the least-busy gym hours, derived from check-in history over the
// last 30 days (gym-wide). Powers the dashboard "best time to train" hint.
export async function getBestTime() {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 30);

  const agg = await Attendance.aggregate<{ _id: number; count: number }>([
    { $match: { checkInAt: { $gte: since } } },
    { $group: { _id: { $hour: '$checkInAt' }, count: { $sum: 1 } } },
  ]);
  const map = new Map(agg.map((a) => [a._id, a.count]));

  const OPEN_FROM = 5;
  const OPEN_TO = 22;
  const hours: { hour: number; count: number }[] = [];
  for (let h = OPEN_FROM; h <= OPEN_TO; h++) hours.push({ hour: h, count: map.get(h) ?? 0 });

  const quietest = [...hours].sort((a, b) => a.count - b.count).slice(0, 3);
  return { hours, quietest, suggestion: quietest[0]?.hour ?? null };
}

// Attendance days for a given month (calendar view). month is 1-12.
export async function getMonth(userId: string, year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  const records = await Attendance.find({
    user: userId,
    checkInAt: { $gte: from, $lt: to },
  })
    .select('checkInAt checkOutAt')
    .sort({ checkInAt: 1 })
    .lean();

  return records.map((r) => ({
    id: String(r._id),
    checkInAt: r.checkInAt,
    checkOutAt: r.checkOutAt ?? null,
    day: dayKey(new Date(r.checkInAt as Date)),
  }));
}
