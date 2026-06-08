import { Attendance, GymConfig } from '../../models/index.js';
import { HttpError } from '../../middleware/error.js';

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

async function getCapacity(): Promise<number> {
  const config = await GymConfig.findOne();
  return config?.capacity ?? 50;
}

// Live occupancy = members currently checked in (no checkout yet).
export async function getOccupancy() {
  const [activeCount, capacity] = await Promise.all([
    Attendance.countDocuments({ checkOutAt: null }),
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
  const open = await Attendance.findOne({ user: userId, checkOutAt: null });
  if (open) throw new HttpError(409, 'You are already checked in');

  // Spec rule: new check-ins are disabled at full capacity.
  const occupancy = await getOccupancy();
  if (occupancy.level === 'FULL') {
    throw new HttpError(409, 'The gym is at full capacity. Please try again later.');
  }

  const record = await Attendance.create({ user: userId, checkInAt: new Date() });
  return record;
}

export async function checkOut(userId: string) {
  const open = await Attendance.findOne({ user: userId, checkOutAt: null });
  if (!open) throw new HttpError(400, 'You are not currently checked in');
  open.checkOutAt = new Date();
  await open.save();
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

  return {
    checkedIn: Boolean(open),
    since: open?.checkInAt ?? null,
    streak,
    milestones: { 3: streak >= 3, 7: streak >= 7, 14: streak >= 14 },
    totals: { thisWeek, thisMonth, allTime: dayKeys.size },
    occupancy,
  };
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
