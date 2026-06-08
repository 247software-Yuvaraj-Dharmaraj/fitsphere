import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Flame, LogIn, LogOut, Users } from 'lucide-react';
import {
  useAttendanceSummary,
  useCheckIn,
  useCheckOut,
  useMonthAttendance,
} from '../features/attendance/attendance.hooks';
import { AttendanceCalendar } from '../features/attendance/AttendanceCalendar';
import type { CrowdLevel } from '../features/attendance/attendance.api';
import { getApiErrorMessage } from '../lib/api';

const LEVEL_STYLES: Record<CrowdLevel, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  FULL: 'bg-red-100 text-red-700',
};

export function AttendancePage() {
  const { t, i18n } = useTranslation();
  const summary = useAttendanceSummary();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const now = new Date();
  const [view, setView] = useState({ year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 });
  const monthQuery = useMonthAttendance(view.year, view.month);
  const attendedDays = useMemo(
    () => new Set((monthQuery.data ?? []).map((r) => r.day)),
    [monthQuery.data],
  );

  function shiftMonth(delta: number) {
    setView((v) => {
      const d = new Date(Date.UTC(v.year, v.month - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });
  }

  function handleCheckIn() {
    checkIn.mutate(undefined, {
      onError: (err) => toast.error(getApiErrorMessage(err, 'Check-in failed')),
      onSuccess: () => toast.success(t('attendance.checkedInToast')),
    });
  }
  function handleCheckOut() {
    checkOut.mutate(undefined, {
      onError: (err) => toast.error(getApiErrorMessage(err, 'Check-out failed')),
      onSuccess: () => toast.success(t('attendance.checkedOutToast')),
    });
  }

  const s = summary.data;
  const occupancy = s?.occupancy;
  const busy = checkIn.isPending || checkOut.isPending;
  const sinceLabel = s?.since
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(s.since))
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">{t('pages.attendance.title')}</h1>
        <p className="mt-1 text-slate-500">{t('pages.attendance.subtitle')}</p>
      </header>

      {/* Today / check-in card */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users size={16} />
            {occupancy ? (
              <span>
                {occupancy.activeCount}/{occupancy.capacity} {t('attendance.inGym')}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[occupancy.level]}`}
                >
                  {t(`attendance.levels.${occupancy.level}`)} · {occupancy.percent}%
                </span>
              </span>
            ) : (
              <span>{t('common.loading')}</span>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-slate-600">
            {s?.checkedIn
              ? t('attendance.checkedInSince', { time: sinceLabel })
              : t('attendance.notCheckedIn')}
          </p>
          {s?.checkedIn ? (
            <button
              onClick={handleCheckOut}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-3 font-medium text-white hover:bg-slate-900 disabled:opacity-60"
            >
              <LogOut size={18} />
              {t('attendance.checkOut')}
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={busy || occupancy?.level === 'FULL'}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <LogIn size={18} />
              {occupancy?.level === 'FULL' ? t('attendance.full') : t('attendance.checkIn')}
            </button>
          )}
        </div>
      </section>

      {/* Streak + totals */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<Flame size={18} className="text-orange-500" />}
          label={t('attendance.streak')}
          value={s ? `${s.streak} ${t('attendance.days')}` : '—'}
        />
        <StatCard label={t('attendance.thisWeek')} value={s ? String(s.totals.thisWeek) : '—'} />
        <StatCard label={t('attendance.thisMonth')} value={s ? String(s.totals.thisMonth) : '—'} />
        <StatCard label={t('attendance.allTime')} value={s ? String(s.totals.allTime) : '—'} />
      </section>

      {/* Milestones */}
      {s && (
        <section className="flex flex-wrap gap-2">
          {([3, 7, 14] as const).map((m) => (
            <span
              key={m}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                s.milestones[m]
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {s.milestones[m] ? '🔥 ' : ''}
              {t('attendance.dayStreak', { count: m })}
            </span>
          ))}
        </section>
      )}

      {/* Calendar */}
      <AttendanceCalendar
        year={view.year}
        month={view.month}
        attendedDays={attendedDays}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
        loading={monthQuery.isFetching}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-1 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-800">{value}</div>
    </div>
  );
}
