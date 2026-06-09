import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as api from './analytics.api';
import type { MembersQuery } from './analytics.api';

export const analyticsKeys = {
  overview: ['analytics', 'overview'] as const,
  members: (query: MembersQuery) => ['analytics', 'members', query] as const,
};

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: analyticsKeys.overview,
    queryFn: ({ signal }) => api.getOverview(signal),
  });
}

// `query.q` should already be debounced by the caller. `signal` cancels the
// in-flight request when params change (AbortController via TanStack Query).
export function useMembers(query: MembersQuery) {
  return useQuery({
    queryKey: analyticsKeys.members(query),
    queryFn: ({ signal }) => api.getMembers(query, signal),
    placeholderData: keepPreviousData, // avoid flicker while typing / paging
  });
}
