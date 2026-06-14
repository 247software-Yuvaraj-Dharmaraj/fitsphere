import { api } from '../../lib/api';

// Browser UTC offset in minutes EAST of UTC (getTimezoneOffset is the inverse),
// sent to the API so personal day buckets (streak, calendar, week/month) align
// with the user's local day instead of UTC.
const tzOffset = () => -new Date().getTimezoneOffset();

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

export interface AttendanceTrend {
  days: number;
  series: { day: string; present: number }[];
  attendedDays: number;
  consistency: number; // percent
}

export async function getTrend(days = 14, signal?: AbortSignal): Promise<AttendanceTrend> {
  const { data } = await api.get<AttendanceTrend>('/attendance/trend', {
    params: { days, tz: tzOffset() },
    signal,
  });
  return data;
}

export interface BestTime {
  hours: { hour: number; count: number }[];
  quietest: { hour: number; count: number }[];
  suggestion: number | null;
}

export async function getBestTime(signal?: AbortSignal): Promise<BestTime> {
  const { data } = await api.get<BestTime>('/attendance/best-time', { signal });
  return data;
}

export async function getSummary(signal?: AbortSignal): Promise<AttendanceSummary> {
  const { data } = await api.get<AttendanceSummary>('/attendance/summary', {
    params: { tz: tzOffset() },
    signal,
  });
  return data;
}

export async function getMonth(
  year: number,
  month: number,
  signal?: AbortSignal,
): Promise<MonthRecord[]> {
  const { data } = await api.get<MonthRecord[]>('/attendance/month', {
    params: { year, month, tz: tzOffset() },
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
