import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './workouts.api';

export const workoutKeys = {
  stats: ['workouts', 'stats'] as const,
  recent: (limit: number) => ['workouts', 'recent', limit] as const,
};

export function useWorkoutStats() {
  return useQuery({
    queryKey: workoutKeys.stats,
    queryFn: ({ signal }) => api.getStats(signal),
  });
}

export function useRecentWorkouts(limit = 5) {
  return useQuery({
    queryKey: workoutKeys.recent(limit),
    queryFn: ({ signal }) => api.getRecent(limit, signal),
  });
}

export function useLogWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.logWorkout,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  });
}
