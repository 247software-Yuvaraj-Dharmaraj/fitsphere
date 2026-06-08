import { Attendance, User } from '../../models/index.js';
import { getOccupancy } from '../attendance/attendance.service.js';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function startOfWeek(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Gym-wide analytics for admins/trainers.
export async function overview() {
  const since30 = daysAgo(30);
  const since14 = daysAgo(13);
  const weekStart = startOfWeek();

  const [hourAgg, dayAgg, totalMembers, activeIds, occupancy] = await Promise.all([
    // Check-ins by hour of day (peak/off-peak) over last 30 days.
    Attendance.aggregate<{ _id: number; count: number }>([
      { $match: { checkInAt: { $gte: since30 } } },
      { $group: { _id: { $hour: '$checkInAt' }, count: { $sum: 1 } } },
    ]),
    // Check-ins per day over the last 14 days.
    Attendance.aggregate<{ _id: string; count: number }>([
      { $match: { checkInAt: { $gte: since14 } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkInAt' } },
          count: { $sum: 1 },
        },
      },
    ]),
    User.countDocuments({ role: 'MEMBER' }),
    Attendance.distinct('user', { checkInAt: { $gte: weekStart } }),
    getOccupancy(),
  ]);

  // Fill 0-23 hours.
  const hourMap = new Map(hourAgg.map((h) => [h._id, h.count]));
  const peakHours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourMap.get(hour) ?? 0,
  }));
  const busiest = peakHours.reduce((a, b) => (b.count > a.count ? b : a), peakHours[0]);

  // Fill missing days in the 14-day window.
  const dayMap = new Map(dayAgg.map((d) => [d._id, d.count]));
  const dailyTrend: { day: string; count: number }[] = [];
  const cursor = new Date(since14);
  for (let i = 0; i < 14; i++) {
    const key = cursor.toISOString().slice(0, 10);
    dailyTrend.push({ day: key, count: dayMap.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    totals: {
      totalMembers,
      activeThisWeek: activeIds.length,
      peakHour: busiest.count > 0 ? busiest.hour : null,
    },
    occupancy,
    peakHours,
    dailyTrend,
  };
}

type MemberStatus = 'ACTIVE' | 'AT_RISK' | 'INACTIVE';
function statusFor(lastVisit: Date | null): MemberStatus {
  if (!lastVisit) return 'INACTIVE';
  const ageDays = (Date.now() - new Date(lastVisit).getTime()) / 86_400_000;
  if (ageDays <= 7) return 'ACTIVE';
  if (ageDays <= 14) return 'AT_RISK';
  return 'INACTIVE';
}

// Member directory with engagement stats; supports search (debounced on client).
export async function members(query: string) {
  const filter: Record<string, unknown> = { role: 'MEMBER' };
  if (query.trim()) {
    const rx = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const users = await User.find(filter).select('name email').limit(50).lean();
  const ids = users.map((u) => u._id);
  const weekStart = startOfWeek();

  const [totals, weekly] = await Promise.all([
    Attendance.aggregate<{ _id: unknown; totalVisits: number; lastVisit: Date }>([
      { $match: { user: { $in: ids } } },
      { $group: { _id: '$user', totalVisits: { $sum: 1 }, lastVisit: { $max: '$checkInAt' } } },
    ]),
    Attendance.aggregate<{ _id: unknown; count: number }>([
      { $match: { user: { $in: ids }, checkInAt: { $gte: weekStart } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]),
  ]);

  const totalMap = new Map(totals.map((t) => [String(t._id), t]));
  const weekMap = new Map(weekly.map((w) => [String(w._id), w.count]));

  return users
    .map((u) => {
      const t = totalMap.get(String(u._id));
      const lastVisit = t?.lastVisit ?? null;
      return {
        id: String(u._id),
        name: u.name,
        email: u.email,
        totalVisits: t?.totalVisits ?? 0,
        thisWeek: weekMap.get(String(u._id)) ?? 0,
        lastVisit,
        status: statusFor(lastVisit),
      };
    })
    .sort((a, b) => b.totalVisits - a.totalVisits);
}
