import { WorkoutLog, WORKOUT_TYPES, type WorkoutType } from '../../models/index.js';
import type { LogWorkoutInput } from './workouts.schema.js';

function startOfWeek(now: Date): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function log(userId: string, input: LogWorkoutInput) {
  return WorkoutLog.create({
    user: userId,
    type: input.type,
    durationMin: input.durationMin,
    date: input.date ? new Date(input.date) : new Date(),
  });
}

export async function recent(userId: string, limit: number) {
  const logs = await WorkoutLog.find({ user: userId })
    .sort({ date: -1 })
    .limit(limit)
    .lean();
  return logs.map((l) => ({
    id: String(l._id),
    type: l.type,
    durationMin: l.durationMin,
    date: l.date,
  }));
}

export async function stats(userId: string) {
  const logs = await WorkoutLog.find({ user: userId }).select('type durationMin date').lean();

  const byType = Object.fromEntries(WORKOUT_TYPES.map((t) => [t, 0])) as Record<
    WorkoutType,
    number
  >;
  let totalMinutes = 0;
  const weekStart = startOfWeek(new Date());
  let thisWeekSessions = 0;

  for (const l of logs) {
    byType[l.type as WorkoutType] = (byType[l.type as WorkoutType] ?? 0) + 1;
    totalMinutes += l.durationMin;
    if (new Date(l.date as Date) >= weekStart) thisWeekSessions += 1;
  }

  const totalSessions = logs.length;
  return {
    byType,
    totalSessions,
    totalMinutes,
    thisWeekSessions,
    avgDuration: totalSessions ? Math.round(totalMinutes / totalSessions) : 0,
  };
}
