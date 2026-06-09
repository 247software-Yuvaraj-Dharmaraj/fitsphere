import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useBookSlot,
  useBulkDeleteSlots,
  useCancelBooking,
  useCreateSlot,
  useDeleteSlot,
  useSlots,
  useUpdateSlot,
} from '../features/slots/slots.hooks';
import type { Slot } from '../features/slots/slots.api';
import { useAuth } from '../features/auth/useAuth';
import { getApiErrorMessage } from '../lib/api';
import { PageHeader } from '../components/ui/page-header';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { DataGrid } from '../components/ui/data-grid';
import { Drawer } from '../components/ui/drawer';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { SelectionBar } from '../components/ui/selection-bar';
import { fieldClasses, labelClasses } from '../components/ui/field';

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

  const dateLabel = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('pages.slots.title')} subtitle={t('pages.slots.subtitle')} />

      <Card className="mb-6 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setDate((d) => shiftDay(d, -1))}
          aria-label={t('common.previous')}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{dateLabel}</span>
        <button
          onClick={() => setDate((d) => shiftDay(d, 1))}
          aria-label={t('common.next')}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ChevronRight size={18} />
        </button>
      </Card>

      {canManage ? <AdminSlots date={date} /> : <MemberBooking date={date} />}
    </div>
  );
}

// ---------- Member view: booking cards ----------
function MemberBooking({ date }: { date: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useSlots(date);
  const book = useBookSlot(date);
  const cancel = useCancelBooking(date);

  if (isLoading) return <p className="text-slate-400 dark:text-slate-500">{t('common.loading')}</p>;
  if (!data || data.slots.length === 0)
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500">
        {t('slots.noSlots')}
      </div>
    );

  const busy = book.isPending || cancel.isPending;
  return (
    <ul className="space-y-3">
      {data.slots.map((slot) => {
        const pct = Math.min(100, Math.round((slot.bookedCount / slot.capacity) * 100));
        const isFull = slot.available === 0 && !slot.bookedByMe;
        return (
          <Card key={slot.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {slot.startTime} – {slot.endTime}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('slots.spotsLeft', { count: slot.available })} · {slot.bookedCount}/
                  {slot.capacity}
                </p>
              </div>
              {slot.bookedByMe ? (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    cancel.mutate(slot.id, {
                      onError: (e) => toast.error(getApiErrorMessage(e, 'Cancel failed')),
                      onSuccess: () => toast.success(t('slots.cancelledToast')),
                    })
                  }
                >
                  {t('slots.cancel')}
                </Button>
              ) : (
                <Button
                  disabled={busy || isFull}
                  onClick={() =>
                    book.mutate(slot.id, {
                      onError: (e) => toast.error(getApiErrorMessage(e, 'Booking failed')),
                      onSuccess: () => toast.success(t('slots.bookedToast')),
                    })
                  }
                >
                  {isFull ? t('slots.full') : t('slots.book')}
                </Button>
              )}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
            </div>
          </Card>
        );
      })}
    </ul>
  );
}

// ---------- Admin/Trainer view: CRUD management grid ----------
function AdminSlots({ date }: { date: string }) {
  const { t } = useTranslation();
  const { data } = useSlots(date);
  const create = useCreateSlot(date);
  const update = useUpdateSlot(date);
  const del = useDeleteSlot(date);
  const bulkDel = useBulkDeleteSlots(date);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [drawer, setDrawer] = useState<{ mode: 'create' | 'edit'; slot?: Slot } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'single'; slot: Slot } | { kind: 'mass' } | null>(
    null,
  );

  const slots = data?.slots ?? [];
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  const columns = useMemo<ColumnDef<Slot, unknown>[]>(
    () => [
      {
        accessorKey: 'startTime',
        header: t('slots.time'),
        cell: ({ row }) => `${row.original.startTime} – ${row.original.endTime}`,
      },
      { accessorKey: 'capacity', header: t('slots.capacityLabel') },
      { accessorKey: 'bookedCount', header: t('slots.booked') },
      { accessorKey: 'available', header: t('slots.available') },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => setDrawer({ mode: 'edit', slot: row.original })}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none dark:hover:bg-slate-800"
              aria-label={t('slots.edit')}
              title={t('slots.edit')}
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => setConfirm({ kind: 'single', slot: row.original })}
              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:outline-none dark:hover:bg-red-950"
              aria-label={t('slots.delete')}
              title={t('slots.delete')}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      },
    ],
    [t],
  );

  function handleSubmit(values: { startTime: string; endTime: string; capacity: number }) {
    if (!drawer) return;
    const onError = (e: unknown) => toast.error(getApiErrorMessage(e, 'Save failed'));
    if (drawer.mode === 'create') {
      create.mutate(
        { date, ...values },
        {
          onError,
          onSuccess: () => {
            toast.success(t('slots.createdToast'));
            setDrawer(null);
          },
        },
      );
    } else if (drawer.slot) {
      update.mutate(
        { id: drawer.slot.id, input: values },
        {
          onError,
          onSuccess: () => {
            toast.success(t('slots.updatedToast'));
            setDrawer(null);
          },
        },
      );
    }
  }

  function confirmDelete() {
    if (!confirm) return;
    if (confirm.kind === 'single') {
      del.mutate(confirm.slot.id, {
        onError: (e) => toast.error(getApiErrorMessage(e, 'Delete failed')),
        onSuccess: () => {
          toast.success(t('slots.deletedToast'));
          setConfirm(null);
        },
      });
    } else {
      bulkDel.mutate(selectedIds, {
        onError: (e) => toast.error(getApiErrorMessage(e, 'Delete failed')),
        onSuccess: () => {
          toast.success(t('slots.deletedToast'));
          setRowSelection({});
          setConfirm(null);
        },
      });
    }
  }

  const saving = create.isPending || update.isPending;
  const deleting = del.isPending || bulkDel.isPending;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setDrawer({ mode: 'create' })}>
          <Plus size={16} />
          {t('slots.newSlot')}
        </Button>
      </div>

      <SelectionBar count={selectedIds.length} onClear={() => setRowSelection({})}>
        <Button variant="danger" size="sm" onClick={() => setConfirm({ kind: 'mass' })}>
          <Trash2 size={14} />
          {t('slots.delete')}
        </Button>
      </SelectionBar>

      <DataGrid
        columns={columns}
        data={slots}
        emptyText={t('slots.noSlots')}
        getRowId={(s) => s.id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      <Drawer
        open={!!drawer}
        title={drawer?.mode === 'edit' ? t('slots.editSlot') : t('slots.newSlot')}
        onClose={() => setDrawer(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawer(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="slot-form" loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <SlotForm initial={drawer?.slot} onSubmit={handleSubmit} />
      </Drawer>

      <ConfirmDialog
        open={!!confirm}
        destructive
        title={t('slots.deleteConfirmTitle')}
        message={
          confirm?.kind === 'mass'
            ? t('slots.deleteConfirmMass', { count: selectedIds.length })
            : t('slots.deleteConfirmSingle')
        }
        confirmLabel={t('slots.delete')}
        loading={deleting}
        onCancel={() => setConfirm(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function SlotForm({
  initial,
  onSubmit,
}: {
  initial?: Slot;
  onSubmit: (v: { startTime: string; endTime: string; capacity: number }) => void;
}) {
  const { t } = useTranslation();
  const [v, setV] = useState({
    startTime: initial?.startTime ?? '06:00',
    endTime: initial?.endTime ?? '07:00',
    capacity: initial?.capacity ?? 15,
  });

  return (
    <form
      id="slot-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="slot-start" className={`mb-1 block ${labelClasses}`}>
          {t('slots.startTime')}
        </label>
        <input
          id="slot-start"
          type="time"
          value={v.startTime}
          onChange={(e) => setV((s) => ({ ...s, startTime: e.target.value }))}
          className={fieldClasses}
        />
      </div>
      <div>
        <label htmlFor="slot-end" className={`mb-1 block ${labelClasses}`}>
          {t('slots.endTime')}
        </label>
        <input
          id="slot-end"
          type="time"
          value={v.endTime}
          onChange={(e) => setV((s) => ({ ...s, endTime: e.target.value }))}
          className={fieldClasses}
        />
      </div>
      <div>
        <label htmlFor="slot-capacity" className={`mb-1 block ${labelClasses}`}>
          {t('slots.capacityLabel')}
        </label>
        <input
          id="slot-capacity"
          type="number"
          min={1}
          value={v.capacity}
          onChange={(e) => setV((s) => ({ ...s, capacity: Number(e.target.value) }))}
          className={fieldClasses}
        />
      </div>
    </form>
  );
}
