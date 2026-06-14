import { Attendance, GymConfig } from '../../models/index.js';
import { HttpError } from '../../middleware/error.js';
import { emitOccupancy } from '../../lib/realtime.js';

// ---- date helpers ----
// Day buckets are computed in the caller's local timezone, given as an offset in
// minutes east of UTC (e.g. IST = +330). Personal stats (calendar, streak,
// week/month) pass the user's offset so an early-morning local check-in counts
// as "today" locally instead of slipping to the previous UTC day. offsetMin
// defaults to 0 (UTC) for global metrics (occupancy) that don't pass one.
const MIN_MS = 60_000;
function shift(d: Date, offsetMin: number): Date {
  return new Date(d.getTime() + offsetMin * MIN_MS);
}
function dayKey(d: Date, offsetMin = 0): string {
  return shift(d, offsetMin).toISOString().slice(0, 10); // local YYYY-MM-DD
}
function startOfWeek(now: Date, offsetMin = 0): Date {
  const d = shift(now, offsetMin);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // 0 = Sun
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - offsetMin * MIN_MS);
}
function startOfMonth(now: Date, offsetMin = 0): Date {
  const d = shift(now, offsetMin);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - offsetMin * MIN_MS);
}
function startOfDay(now: Date = new Date(), offsetMin = 0): Date {
  const d = shift(now, offsetMin);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - offsetMin * MIN_MS);
}

// Single gym-wide timezone for GLOBAL metrics (live-occupancy day boundary,
// busiest-hours grouping) — these reflect the gym's own clock, not each viewer's.
// Offset in minutes east of UTC; set GYM_TZ_OFFSET (e.g. 330 for IST). Default 0.
const GYM_OFFSET = Number(process.env.GYM_TZ_OFFSET) || 0;
// Mongo's $hour accepts a UTC-offset string ("+05:30") as its `timezone`.
function offsetTz(min: number): string {
  const sign = min < 0 ? '-' : '+';
  const a = Math.abs(min);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
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
    Attendance.countDocuments({ checkOutAt: null, checkInAt: { $gte: startOfDay(new Date(), GYM_OFFSET) } }),
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
  const today = startOfDay(new Date(), GYM_OFFSET);
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
function computeStreak(dayKeys: Set<string>, offsetMin = 0): number {
  let streak = 0;
  // Walk backwards in the user's local time (cursor lives in shifted space, so
  // its UTC-date slice is the local day key).
  const cursor = shift(new Date(), offsetMin);
  cursor.setUTCHours(0, 0, 0, 0);
  const key = () => cursor.toISOString().slice(0, 10);
  if (!dayKeys.has(key())) {
    // not in yet today — allow the streak to count up to yesterday
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!dayKeys.has(key())) return 0;
  }
  while (dayKeys.has(key())) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function getSummary(userId: string, offsetMin = 0) {
  const now = new Date();
  const [open, all, occupancy] = await Promise.all([
    Attendance.findOne({ user: userId, checkOutAt: null }),
    Attendance.find({ user: userId }).select('checkInAt').lean(),
    getOccupancy(),
  ]);

  const dayKeys = new Set(all.map((a) => dayKey(new Date(a.checkInAt as Date), offsetMin)));
  const streak = computeStreak(dayKeys, offsetMin);

  // Compare on local day-key strings (ISO dates sort lexicographically).
  const weekStartKey = dayKey(startOfWeek(now, offsetMin), offsetMin);
  const monthStartKey = dayKey(startOfMonth(now, offsetMin), offsetMin);
  const thisWeek = [...dayKeys].filter((k) => k >= weekStartKey).length;
  const thisMonth = [...dayKeys].filter((k) => k >= monthStartKey).length;

  // Only count an open session as "checked in" if it started today (locally).
  const checkedInToday = Boolean(open) && (open!.checkInAt as Date) >= startOfDay(now, offsetMin);

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
export async function getTrend(userId: string, days: number, offsetMin = 0) {
  // Window start = local midnight, (days - 1) local days ago. cursor lives in
  // shifted space (its UTC-date slice is the local day key).
  const cursor = shift(new Date(), offsetMin);
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() - (days - 1));
  const since = new Date(cursor.getTime() - offsetMin * MIN_MS);

  const records = await Attendance.find({
    user: userId,
    checkInAt: { $gte: since },
  })
    .select('checkInAt')
    .lean();
  const present = new Set(records.map((r) => dayKey(new Date(r.checkInAt as Date), offsetMin)));

  const series: { day: string; present: number }[] = [];
  for (let i = 0; i < days; i++) {
    const key = cursor.toISOString().slice(0, 10);
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
  // Gym-local window + hour-of-day grouping, so "busiest hours" reflect the
  // gym's clock rather than UTC.
  const since = startOfDay(new Date(), GYM_OFFSET);
  since.setUTCDate(since.getUTCDate() - 30);

  const agg = await Attendance.aggregate<{ _id: number; count: number }>([
    { $match: { checkInAt: { $gte: since } } },
    { $group: { _id: { $hour: { date: '$checkInAt', timezone: offsetTz(GYM_OFFSET) } }, count: { $sum: 1 } } },
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
export async function getMonth(userId: string, year: number, month: number, offsetMin = 0) {
  // Range spans the LOCAL month: convert local month boundaries to real instants.
  const from = new Date(Date.UTC(year, month - 1, 1) - offsetMin * MIN_MS);
  const to = new Date(Date.UTC(year, month, 1) - offsetMin * MIN_MS);
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
    day: dayKey(new Date(r.checkInAt as Date), offsetMin),
  }));
}
