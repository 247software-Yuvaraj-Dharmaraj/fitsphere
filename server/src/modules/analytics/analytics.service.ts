import { Attendance, User } from '../../models/index.js';
import { getOccupancy } from '../attendance/attendance.service.js';
import type { MembersQuery } from './analytics.schema.js';

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

interface MemberRowAgg {
  _id: unknown;
  name: string;
  email: string;
  totalVisits: number;
  thisWeek: number;
  lastVisit: Date | null;
  status: 'ACTIVE' | 'AT_RISK' | 'INACTIVE';
}

// Server-side member directory: search + sort + pagination computed in a single
// aggregation (mirrors ui-service's server-driven DataGrid). Returns the page of
// rows plus the total count.
export async function members(query: MembersQuery) {
  const { q, page, pageSize, sort, dir, status } = query;
  const weekStart = startOfWeek();
  const now = new Date();

  const match: Record<string, unknown> = { role: 'MEMBER' };
  if (q.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ name: rx }, { email: rx }];
  }

  // status sorts by recency rank, not the string.
  const sortKey = sort === 'status' ? 'statusRank' : sort;
  const sortDir = dir === 'asc' ? 1 : -1;

  const [result] = await User.aggregate([
    { $match: match },
    {
      $lookup: { from: 'attendances', localField: '_id', foreignField: 'user', as: 'att' },
    },
    {
      $addFields: {
        totalVisits: { $size: '$att' },
        lastVisit: { $max: '$att.checkInAt' },
        thisWeek: {
          $size: {
            $filter: { input: '$att', as: 'a', cond: { $gte: ['$$a.checkInAt', weekStart] } },
          },
        },
      },
    },
    {
      $addFields: {
        ageDays: {
          $cond: [
            { $eq: ['$lastVisit', null] },
            99999,
            { $divide: [{ $subtract: [now, '$lastVisit'] }, 86_400_000] },
          ],
        },
      },
    },
    {
      $addFields: {
        status: {
          $switch: {
            branches: [
              { case: { $lte: ['$ageDays', 7] }, then: 'ACTIVE' },
              { case: { $lte: ['$ageDays', 14] }, then: 'AT_RISK' },
            ],
            default: 'INACTIVE',
          },
        },
        statusRank: {
          $switch: {
            branches: [
              { case: { $lte: ['$ageDays', 7] }, then: 0 },
              { case: { $lte: ['$ageDays', 14] }, then: 1 },
            ],
            default: 2,
          },
        },
      },
    },
    { $project: { name: 1, email: 1, totalVisits: 1, thisWeek: 1, lastVisit: 1, status: 1, statusRank: 1 } },
    // Status filter (applied after status is computed; ALL skips it).
    ...(status !== 'ALL' ? [{ $match: { status } }] : []),
    {
      $facet: {
        rows: [{ $sort: { [sortKey]: sortDir, _id: 1 } }, { $skip: page * pageSize }, { $limit: pageSize }],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const rows = (result.rows as MemberRowAgg[]).map((r) => ({
    id: String(r._id),
    name: r.name,
    email: r.email,
    totalVisits: r.totalVisits,
    thisWeek: r.thisWeek,
    lastVisit: r.lastVisit ?? null,
    status: r.status,
  }));
  const total = (result.total[0]?.count as number) ?? 0;

  return { rows, total, page, pageSize };
}
