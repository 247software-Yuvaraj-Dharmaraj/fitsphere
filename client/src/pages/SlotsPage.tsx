import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import {
  useBookSlot,
  useCancelBooking,
  useCreateSlot,
  useDeleteSlot,
  useSlots,
} from '../features/slots/slots.hooks';
import type { Slot } from '../features/slots/slots.api';
import { useAuth } from '../features/auth/useAuth';
import { getApiErrorMessage } from '../lib/api';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function shiftDay(date: string, delta: number) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

export function SlotsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'TRAINER';

  const [date, setDate] = useState(todayKey());
  const { data, isLoading } = useSlots(date);
  const book = useBookSlot(date);
  const cancel = useCancelBooking(date);

  const dateLabel = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">{t('pages.slots.title')}</h1>
        <p className="mt-1 text-slate-500">{t('pages.slots.subtitle')}</p>
      </header>

      {/* Date nav */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
        <button
          onClick={() => setDate((d) => shiftDay(d, -1))}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-slate-700">{dateLabel}</span>
        <button
          onClick={() => setDate((d) => shiftDay(d, 1))}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {canManage && <CreateSlotForm date={date} />}

      {/* Slot list */}
      {isLoading ? (
        <p className="text-slate-400">{t('common.loading')}</p>
      ) : !data || data.slots.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
          {t('slots.noSlots')}
        </div>
      ) : (
        <ul className="space-y-3">
          {data.slots.map((slot) => (
            <SlotRow
              key={slot.id}
              slot={slot}
              canManage={canManage}
              onBook={() =>
                book.mutate(slot.id, {
                  onError: (e) => toast.error(getApiErrorMessage(e, 'Booking failed')),
                  onSuccess: () => toast.success(t('slots.bookedToast')),
                })
              }
              onCancel={() =>
                cancel.mutate(slot.id, {
                  onError: (e) => toast.error(getApiErrorMessage(e, 'Cancel failed')),
                  onSuccess: () => toast.success(t('slots.cancelledToast')),
                })
              }
              date={date}
              busy={book.isPending || cancel.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SlotRow({
  slot,
  canManage,
  onBook,
  onCancel,
  date,
  busy,
}: {
  slot: Slot;
  canManage: boolean;
  onBook: () => void;
  onCancel: () => void;
  date: string;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const del = useDeleteSlot(date);
  const pct = Math.min(100, Math.round((slot.bookedCount / slot.capacity) * 100));
  const isFull = slot.available === 0 && !slot.bookedByMe;

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-800">
            {slot.startTime} – {slot.endTime}
          </p>
          <p className="text-xs text-slate-500">
            {t('slots.spotsLeft', { count: slot.available })} · {slot.bookedCount}/{slot.capacity}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {slot.bookedByMe ? (
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {t('slots.cancel')}
            </button>
          ) : (
            <button
              onClick={onBook}
              disabled={busy || isFull}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isFull ? t('slots.full') : t('slots.book')}
            </button>
          )}
          {canManage && (
            <button
              onClick={() => del.mutate(slot.id)}
              disabled={del.isPending}
              className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              title={t('slots.delete')}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

function CreateSlotForm({ date }: { date: string }) {
  const { t } = useTranslation();
  const create = useCreateSlot(date);
  const [form, setForm] = useState({ startTime: '06:00', endTime: '07:00', capacity: 15 });

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate(
      { date, ...form },
      {
        onError: (err) => toast.error(getApiErrorMessage(err, 'Could not create slot')),
        onSuccess: () => toast.success(t('slots.createdToast')),
      },
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          {t('slots.startTime')}
        </label>
        <input
          type="time"
          value={form.startTime}
          onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          {t('slots.endTime')}
        </label>
        <input
          type="time"
          value={form.endTime}
          onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          {t('slots.capacityLabel')}
        </label>
        <input
          type="number"
          min={1}
          value={form.capacity}
          onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={create.isPending}
        className="flex items-center gap-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        <Plus size={16} />
        {t('slots.add')}
      </button>
    </form>
  );
}
