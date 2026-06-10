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

export type MemberStatusFilter = 'ALL' | MemberStatus;

export interface MembersQuery {
  q: string;
  page: number;
  pageSize: number;
  sort: 'name' | 'totalVisits' | 'thisWeek' | 'lastVisit' | 'status';
  dir: 'asc' | 'desc';
  status: MemberStatusFilter;
}

export interface MembersPage {
  rows: MemberRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getMembers(query: MembersQuery, signal?: AbortSignal): Promise<MembersPage> {
  const { data } = await api.get<MembersPage>('/analytics/members', { params: query, signal });
  return data;
}
