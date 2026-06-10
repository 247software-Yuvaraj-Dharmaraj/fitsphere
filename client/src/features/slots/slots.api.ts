import { api } from '../../lib/api';

export interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  available: number;
  bookedByMe: boolean;
}

export interface SlotsResponse {
  date: string;
  slots: Slot[];
}

export interface CreateSlotInput {
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
}

export async function getSlots(date: string, signal?: AbortSignal): Promise<SlotsResponse> {
  const { data } = await api.get<SlotsResponse>('/slots', { params: { date }, signal });
  return data;
}

export async function getMyBookings(signal?: AbortSignal): Promise<Slot[]> {
  const { data } = await api.get<Slot[]>('/slots/my-bookings', { signal });
  return data;
}

export async function bookSlot(id: string): Promise<void> {
  await api.post(`/slots/${id}/book`);
}

export async function cancelBooking(id: string): Promise<void> {
  await api.delete(`/slots/${id}/book`);
}

export async function createSlot(input: CreateSlotInput): Promise<void> {
  await api.post('/slots', input);
}

export interface UpdateSlotInput {
  startTime: string;
  endTime: string;
  capacity: number;
}

export async function updateSlot(id: string, input: UpdateSlotInput): Promise<void> {
  await api.patch(`/slots/${id}`, input);
}

export async function deleteSlot(id: string): Promise<void> {
  await api.delete(`/slots/${id}`);
}

export async function bulkDeleteSlots(ids: string[]): Promise<{ deleted: number }> {
  const { data } = await api.post<{ deleted: number }>('/slots/bulk-delete', { ids });
  return data;
}
