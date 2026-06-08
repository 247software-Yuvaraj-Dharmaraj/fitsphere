import { api } from '../../lib/api';

export type CrowdLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'FULL';

export interface Occupancy {
  activeCount: number;
  capacity: number;
  percent: number;
  level: CrowdLevel;
}

export interface AttendanceSummary {
  checkedIn: boolean;
  since: string | null;
  streak: number;
  milestones: { 3: boolean; 7: boolean; 14: boolean };
  totals: { thisWeek: number; thisMonth: number; allTime: number };
  occupancy: Occupancy;
}

export interface MonthRecord {
  id: string;
  checkInAt: string;
  checkOutAt: string | null;
  day: string; // YYYY-MM-DD
}

export async function getSummary(signal?: AbortSignal): Promise<AttendanceSummary> {
  const { data } = await api.get<AttendanceSummary>('/attendance/summary', { signal });
  return data;
}

export async function getMonth(
  year: number,
  month: number,
  signal?: AbortSignal,
): Promise<MonthRecord[]> {
  const { data } = await api.get<MonthRecord[]>('/attendance/month', {
    params: { year, month },
    signal,
  });
  return data;
}

export async function checkIn(): Promise<void> {
  await api.post('/attendance/check-in');
}

export async function checkOut(): Promise<void> {
  await api.post('/attendance/check-out');
}
