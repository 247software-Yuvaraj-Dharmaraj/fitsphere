import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { Flame, Target, Dumbbell, CalendarCheck } from 'lucide-react';
import { useAttendanceSummary, useAttendanceTrend } from '../features/attendance/attendance.hooks';
import {
  useLogWorkout,
  useRecentWorkouts,
  useWorkoutStats,
} from '../features/workouts/workouts.hooks';
import type { WorkoutType } from '../features/workouts/workouts.api';
import { getApiErrorMessage } from '../lib/api';

const WORKOUT_TYPES: WorkoutType[] = ['CARDIO', 'STRENGTH', 'MIXED'];
const TYPE_COLORS: Record<WorkoutType, string> = {
  CARDIO: '#3b82f6',
  STRENGTH: '#16a34a',
  MIXED: '#f59e0b',
};

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const summary = useAttendanceSummary();
  const trend = useAttendanceTrend(14);
  const stats = useWorkoutStats();
  const recent = useRecentWorkouts(5);

  const trendData =
    trend.data?.series.map((s) => ({ label: s.day.slice(8), present: s.present })) ?? [];
  const pieData = stats.data
    ? WORKOUT_TYPES.map((type) => ({ type, value: stats.data.byType[type] })).filter(
        (d) => d.value > 0,
      )
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">{t('pages.dashboard.title')}</h1>
        <p className="mt-1 text-slate-500">{t('pages.dashboard.subtitle')}</p>
      </header>

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Flame size={18} className="text-orange-500" />}
          label={t('attendance.streak')}
          value={summary.data ? `${summary.data.streak}` : '—'}
        />
        <StatCard
          icon={<Target size={18} className="text-brand-600" />}
          label={t('dashboard.consistency')}
          value={trend.data ? `${trend.data.consistency}%` : '—'}
        />
        <StatCard
          icon={<Dumbbell size={18} className="text-slate-600" />}
          label={t('dashboard.workoutsThisWeek')}
          value={stats.data ? `${stats.data.thisWeekSessions}` : '—'}
        />
        <StatCard
          icon={<CalendarCheck size={18} className="text-green-600" />}
          label={t('dashboard.visitsThisWeek')}
          value={summary.data ? `${summary.data.totals.thisWeek}` : '—'}
        />
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card title={t('dashboard.attendanceTrend')} subtitle={t('dashboard.last14days')}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                formatter={(v) => [Number(v) ? t('dashboard.present') : t('dashboard.absent'), '']}
              />
              <Bar dataKey="present" radius={[3, 3, 0, 0]} fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title={t('dashboard.workoutMix')}>
          {pieData.length === 0 ? (
            <EmptyHint text={t('dashboard.noWorkouts')} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="type" innerRadius={45} outerRadius={75}>
                  {pieData.map((d) => (
                    <Cell key={d.type} fill={TYPE_COLORS[d.type]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, t(`dashboard.types.${String(n)}`)]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {pieData.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {pieData.map((d) => (
                <span key={d.type} className="flex items-center gap-1 text-slate-600">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: TYPE_COLORS[d.type] }}
                  />
                  {t(`dashboard.types.${d.type}`)}
                </span>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Quick log + recent */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card title={t('dashboard.logWorkout')}>
          <LogWorkoutForm />
        </Card>
        <Card title={t('dashboard.recentWorkouts')}>
          {recent.data && recent.data.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {recent.data.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: TYPE_COLORS[w.type] }}
                    />
                    {t(`dashboard.types.${w.type}`)}
                  </span>
                  <span className="text-slate-500">
                    {w.durationMin} {t('dashboard.minutes')} ·{' '}
                    {new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
                      day: 'numeric',
                      month: 'short',
                    }).format(new Date(w.date))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint text={t('dashboard.noWorkouts')} />
          )}
        </Card>
      </section>
    </div>
  );
}

function LogWorkoutForm() {
  const { t } = useTranslation();
  const logWorkout = useLogWorkout();
  const [type, setType] = useState<WorkoutType>('STRENGTH');
  const [durationMin, setDurationMin] = useState(45);

  function submit() {
    logWorkout.mutate(
      { type, durationMin },
      {
        onError: (err) => toast.error(getApiErrorMessage(err, 'Could not log workout')),
        onSuccess: () => toast.success(t('dashboard.loggedToast')),
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {WORKOUT_TYPES.map((wt) => (
          <button
            key={wt}
            onClick={() => setType(wt)}
            className={`flex-1 rounded-md border px-2 py-2 text-sm font-medium ${
              type === wt
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t(`dashboard.types.${wt}`)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">{t('dashboard.duration')}</label>
        <input
          type="number"
          min={1}
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
        <span className="text-sm text-slate-400">{t('dashboard.minutes')}</span>
      </div>
      <button
        onClick={submit}
        disabled={logWorkout.isPending}
        className="w-full rounded-md bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {t('dashboard.log')}
      </button>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-1 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center text-sm text-slate-400">{text}</div>
  );
}
