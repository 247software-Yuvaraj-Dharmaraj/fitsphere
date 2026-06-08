import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './attendance.api';
import type { AttendanceSummary } from './attendance.api';

export const attendanceKeys = {
  summary: ['attendance', 'summary'] as const,
  month: (year: number, month: number) => ['attendance', 'month', year, month] as const,
  trend: (days: number) => ['attendance', 'trend', days] as const,
};

export function useAttendanceTrend(days = 14) {
  return useQuery({
    queryKey: attendanceKeys.trend(days),
    queryFn: ({ signal }) => api.getTrend(days, signal),
  });
}

// `signal` is forwarded to axios so navigating away cancels the request.
export function useAttendanceSummary() {
  return useQuery({
    queryKey: attendanceKeys.summary,
    queryFn: ({ signal }) => api.getSummary(signal),
    refetchInterval: 30_000, // keep live occupancy fresh
  });
}

export function useMonthAttendance(year: number, month: number) {
  return useQuery({
    queryKey: attendanceKeys.month(year, month),
    queryFn: ({ signal }) => api.getMonth(year, month, signal),
  });
}

// Optimistic check-in: flip the UI immediately, roll back if the server rejects
// (e.g. gym at full capacity).
export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.checkIn,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: attendanceKeys.summary });
      const prev = qc.getQueryData<AttendanceSummary>(attendanceKeys.summary);
      if (prev) {
        qc.setQueryData<AttendanceSummary>(attendanceKeys.summary, {
          ...prev,
          checkedIn: true,
          since: new Date().toISOString(),
          occupancy: { ...prev.occupancy, activeCount: prev.occupancy.activeCount + 1 },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(attendanceKeys.summary, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.checkOut,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: attendanceKeys.summary });
      const prev = qc.getQueryData<AttendanceSummary>(attendanceKeys.summary);
      if (prev) {
        qc.setQueryData<AttendanceSummary>(attendanceKeys.summary, {
          ...prev,
          checkedIn: false,
          since: null,
          occupancy: {
            ...prev.occupancy,
            activeCount: Math.max(0, prev.occupancy.activeCount - 1),
          },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(attendanceKeys.summary, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
