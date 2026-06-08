import { api } from '../../lib/api';

export type WorkoutType = 'CARDIO' | 'STRENGTH' | 'MIXED';

export interface WorkoutLog {
  id: string;
  type: WorkoutType;
  durationMin: number;
  date: string;
}

export interface WorkoutStats {
  byType: Record<WorkoutType, number>;
  totalSessions: number;
  totalMinutes: number;
  thisWeekSessions: number;
  avgDuration: number;
}

export async function logWorkout(input: {
  type: WorkoutType;
  durationMin: number;
}): Promise<void> {
  await api.post('/workouts', input);
}

export async function getRecent(limit = 10, signal?: AbortSignal): Promise<WorkoutLog[]> {
  const { data } = await api.get<WorkoutLog[]>('/workouts', { params: { limit }, signal });
  return data;
}

export async function getStats(signal?: AbortSignal): Promise<WorkoutStats> {
  const { data } = await api.get<WorkoutStats>('/workouts/stats', { signal });
  return data;
}
