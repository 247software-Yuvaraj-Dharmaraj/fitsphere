import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './slots.api';
import type { SlotsResponse } from './slots.api';

export const slotsKeys = {
  byDate: (date: string) => ['slots', date] as const,
};

export function useSlots(date: string) {
  return useQuery({
    queryKey: slotsKeys.byDate(date),
    queryFn: ({ signal }) => api.getSlots(date, signal),
  });
}

// Optimistically toggle a single slot's booking state within the day's list.
function patchSlot(
  qc: ReturnType<typeof useQueryClient>,
  date: string,
  slotId: string,
  booked: boolean,
) {
  const key = slotsKeys.byDate(date);
  const prev = qc.getQueryData<SlotsResponse>(key);
  if (prev) {
    qc.setQueryData<SlotsResponse>(key, {
      ...prev,
      slots: prev.slots.map((s) =>
        s.id === slotId
          ? {
              ...s,
              bookedByMe: booked,
              bookedCount: s.bookedCount + (booked ? 1 : -1),
              available: Math.max(0, s.available + (booked ? -1 : 1)),
            }
          : s,
      ),
    });
  }
  return prev;
}

export function useBookSlot(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => api.bookSlot(slotId),
    onMutate: async (slotId) => {
      await qc.cancelQueries({ queryKey: slotsKeys.byDate(date) });
      return { prev: patchSlot(qc, date, slotId, true) };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(slotsKeys.byDate(date), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: slotsKeys.byDate(date) }),
  });
}

export function useCancelBooking(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => api.cancelBooking(slotId),
    onMutate: async (slotId) => {
      await qc.cancelQueries({ queryKey: slotsKeys.byDate(date) });
      return { prev: patchSlot(qc, date, slotId, false) };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(slotsKeys.byDate(date), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: slotsKeys.byDate(date) }),
  });
}

export function useCreateSlot(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createSlot,
    onSuccess: () => qc.invalidateQueries({ queryKey: slotsKeys.byDate(date) }),
  });
}

export function useDeleteSlot(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => api.deleteSlot(slotId),
    onSuccess: () => qc.invalidateQueries({ queryKey: slotsKeys.byDate(date) }),
  });
}
