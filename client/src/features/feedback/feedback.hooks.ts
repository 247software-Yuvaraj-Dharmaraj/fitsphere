import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './feedback.api';

export const feedbackKeys = {
  mine: ['feedback', 'me'] as const,
  members: ['feedback', 'members'] as const,
  member: (id: string) => ['feedback', 'member', id] as const,
};

export function useMyFeedback() {
  return useQuery({
    queryKey: feedbackKeys.mine,
    queryFn: ({ signal }) => api.getMyFeedback(signal),
  });
}

export function useFeedbackMembers(enabled = true) {
  return useQuery({
    queryKey: feedbackKeys.members,
    queryFn: ({ signal }) => api.listMembers(signal),
    enabled,
  });
}

export function useMemberFeedback(memberId: string) {
  return useQuery({
    queryKey: feedbackKeys.member(memberId),
    queryFn: ({ signal }) => api.getMemberFeedback(memberId, signal),
    enabled: Boolean(memberId),
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createFeedback,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: feedbackKeys.member(vars.memberId) });
      qc.invalidateQueries({ queryKey: feedbackKeys.mine });
    },
  });
}
