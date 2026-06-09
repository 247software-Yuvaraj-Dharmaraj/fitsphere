import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Flame, LogIn, LogOut, Users, CalendarCheck } from 'lucide-react';
import {
  useAttendanceSummary,
  useCheckIn,
  useCheckOut,
  useMonthAttendance,
} from '../features/attendance/attendance.hooks';
import { AttendanceCalendar } from '../features/attendance/AttendanceCalendar';
import type { CrowdLevel } from '../features/attendance/attendance.api';
import { getApiErrorMessage } from '../lib/api';
import { PageHeader } from '../components/ui/page-header';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge, type BadgeTone } from '../components/ui/badge';

const LEVEL_TONE: Record<CrowdLevel, BadgeTone> = {
  LOW: 'green',
  MEDIUM: 'amber',
  HIGH: 'orange',
  FULL: 'red',
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
        hour12: false,
      }).format(new Date(s.since))
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={<CalendarCheck size={24} />}
        title={t('pages.attendance.title')}
        subtitle={t('pages.attendance.subtitle')}
      />

      {/* Today / check-in card */}
      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Users size={16} />
          {occupancy ? (
            <span className="flex items-center gap-2">
              {occupancy.activeCount}/{occupancy.capacity} {t('attendance.inGym')}
              <Badge tone={LEVEL_TONE[occupancy.level]}>
                {t(`attendance.levels.${occupancy.level}`)} · {occupancy.percent}%
              </Badge>
            </span>
          ) : (
            <span>{t('common.loading')}</span>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-slate-600 dark:text-slate-300">
            {s?.checkedIn
              ? t('attendance.checkedInSince', { time: sinceLabel })
              : t('attendance.notCheckedIn')}
          </p>
          {s?.checkedIn ? (
            <Button variant="secondary" size="md" onClick={handleCheckOut} disabled={busy} className="px-6 py-3">
              <LogOut size={18} />
              {t('attendance.checkOut')}
            </Button>
          ) : (
            <Button onClick={handleCheckIn} disabled={busy || occupancy?.level === 'FULL'} className="px-6 py-3">
              <LogIn size={18} />
              {occupancy?.level === 'FULL' ? t('attendance.full') : t('attendance.checkIn')}
            </Button>
          )}
        </div>
      </Card>

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
            <Badge key={m} tone={s.milestones[m] ? 'green' : 'slate'}>
              {s.milestones[m] ? '🔥 ' : ''}
              {t('attendance.dayStreak', { count: m })}
            </Badge>
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
    <Card className="p-4">
      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
    </Card>
  );
}
