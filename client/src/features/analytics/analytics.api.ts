import { api } from '../../lib/api';
import type { Occupancy } from '../attendance/attendance.api';

export interface AnalyticsOverview {
  totals: { totalMembers: number; activeThisWeek: number; peakHour: number | null };
  occupancy: Occupancy;
  peakHours: { hour: number; count: number }[];
  dailyTrend: { day: string; count: number }[];
}

export type MemberStatus = 'ACTIVE' | 'AT_RISK' | 'INACTIVE';

export interface MemberRow {
  id: string;
  name: string;
  email: string;
  totalVisits: number;
  thisWeek: number;
  lastVisit: string | null;
  status: MemberStatus;
}

export async function getOverview(signal?: AbortSignal): Promise<AnalyticsOverview> {
  const { data } = await api.get<AnalyticsOverview>('/analytics/overview', { signal });
  return data;
}

export async function getMembers(q: string, signal?: AbortSignal): Promise<MemberRow[]> {
  const { data } = await api.get<MemberRow[]>('/analytics/members', { params: { q }, signal });
  return data;
}
