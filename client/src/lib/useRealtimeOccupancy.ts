import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from './socket';
import type { AttendanceSummary, Occupancy } from '../features/attendance/attendance.api';
import type { AnalyticsOverview } from '../features/analytics/analytics.api';

// Subscribes to live occupancy pushes and patches the relevant query caches, so
// the gym's crowd level updates instantly when anyone checks in/out. The 30s
// summary polling stays on as a fallback if the socket drops.
export function useRealtimeOccupancy() {
  const qc = useQueryClient();

  useEffect(() => {
    socket.connect();

    const onOccupancy = (snapshot: Occupancy) => {
      qc.setQueryData<AttendanceSummary>(['attendance', 'summary'], (old) =>
        old ? { ...old, occupancy: snapshot } : old,
      );
      qc.setQueryData<AnalyticsOverview>(['analytics', 'overview'], (old) =>
        old ? { ...old, occupancy: snapshot } : old,
      );
    };

    // Bookings/waitlists changed somewhere — refetch the slot views so a freed
    // seat or a waitlist promotion shows up live (e.g. you get promoted while
    // looking at My Bookings).
    const onSlotsChanged = () => {
      qc.invalidateQueries({ queryKey: ['slots'] });
    };

    socket.on('occupancy', onOccupancy);
    socket.on('slots:changed', onSlotsChanged);
    return () => {
      socket.off('occupancy', onOccupancy);
      socket.off('slots:changed', onSlotsChanged);
      socket.disconnect();
    };
  }, [qc]);
}
