import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as api from './analytics.api';

export const analyticsKeys = {
  overview: ['analytics', 'overview'] as const,
  members: (q: string) => ['analytics', 'members', q] as const,
};

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: analyticsKeys.overview,
    queryFn: ({ signal }) => api.getOverview(signal),
  });
}

// `q` should already be debounced by the caller. `signal` cancels the in-flight
// request when the debounced term changes (AbortController via TanStack Query).
export function useMembers(q: string) {
  return useQuery({
    queryKey: analyticsKeys.members(q),
    queryFn: ({ signal }) => api.getMembers(q, signal),
    placeholderData: keepPreviousData, // avoid list flicker while typing
  });
}
