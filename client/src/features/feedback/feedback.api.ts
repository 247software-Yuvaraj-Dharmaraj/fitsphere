import { api } from '../../lib/api';

export interface FeedbackItem {
  id: string;
  note: string;
  weekOf: string;
  createdAt: string;
  trainerName: string;
}

export interface MemberOption {
  id: string;
  name: string;
  email: string;
}

export async function getMyFeedback(signal?: AbortSignal): Promise<FeedbackItem[]> {
  const { data } = await api.get<FeedbackItem[]>('/feedback/me', { signal });
  return data;
}

export async function listMembers(signal?: AbortSignal): Promise<MemberOption[]> {
  const { data } = await api.get<MemberOption[]>('/feedback/members', { signal });
  return data;
}

export async function getMemberFeedback(
  memberId: string,
  signal?: AbortSignal,
): Promise<FeedbackItem[]> {
  const { data } = await api.get<FeedbackItem[]>(`/feedback/member/${memberId}`, { signal });
  return data;
}

export async function createFeedback(input: {
  memberId: string;
  note: string;
}): Promise<void> {
  await api.post('/feedback', input);
}
