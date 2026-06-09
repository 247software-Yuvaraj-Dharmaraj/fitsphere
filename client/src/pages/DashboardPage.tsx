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
import { Flame, Target, Dumbbell, CalendarCheck, Clock } from 'lucide-react';
import {
  useAttendanceSummary,
  useAttendanceTrend,
  useBestTime,
} from '../features/attendance/attendance.hooks';
import { Skeleton, SkeletonCard, SkeletonPanel } from '../components/Skeleton';
import {
  useLogWorkout,
  useRecentWorkouts,
  useWorkoutStats,
} from '../features/workouts/workouts.hooks';
import type { WorkoutType } from '../features/workouts/workouts.api';
import { getApiErrorMessage } from '../lib/api';
import { PageHeader } from '../components/ui/page-header';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Empty } from '../components/ui/empty';
import { fieldClasses } from '../components/ui/field';

const WORKOUT_TYPES: WorkoutType[] = ['CARDIO', 'STRENGTH', 'MIXED'];
const TYPE_COLORS: Record<WorkoutType, string> = {
  CARDIO: '#3b82f6',
  STRENGTH: '#16a34a',
  MIXED: '#f59e0b',
};
const tickStyle = { fontSize: 11, fill: '#94a3b8' };

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const summary = useAttendanceSummary();
  const trend = useAttendanceTrend(14);
  const stats = useWorkoutStats();
  const recent = useRecentWorkouts(5);
  const bestTime = useBestTime();

  const formatHour = (h: number) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
      hour: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(2024, 0, 1, h)));

  const trendData =
    trend.data?.series.map((s) => ({ label: s.day.slice(8), present: s.present })) ?? [];
  const pieData = stats.data
    ? WORKOUT_TYPES.map((type) => ({ type, value: stats.data.byType[type] })).filter(
        (d) => d.value > 0,
      )
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t('pages.dashboard.title')} subtitle={t('pages.dashboard.subtitle')} />

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.isLoading || trend.isLoading || stats.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon={<Flame size={18} className="text-orange-500" />} label={t('attendance.streak')} value={summary.data ? `${summary.data.streak}` : '—'} />
            <StatCard icon={<Target size={18} className="text-brand-600" />} label={t('dashboard.consistency')} value={trend.data ? `${trend.data.consistency}%` : '—'} />
            <StatCard icon={<Dumbbell size={18} className="text-slate-500" />} label={t('dashboard.workoutsThisWeek')} value={stats.data ? `${stats.data.thisWeekSessions}` : '—'} />
            <StatCard icon={<CalendarCheck size={18} className="text-green-600" />} label={t('dashboard.visitsThisWeek')} value={summary.data ? `${summary.data.totals.thisWeek}` : '—'} />
          </>
        )}
      </section>

      {/* Best time to train */}
      <Card className="flex flex-wrap items-center gap-3 border-brand-100 bg-brand-50 p-4 dark:border-brand-500/20 dark:bg-brand-500/10">
        <Clock size={20} className="text-brand-600 dark:text-brand-400" />
        {bestTime.isLoading ? (
          <Skeleton className="h-5 w-64" />
        ) : bestTime.data?.suggestion != null ? (
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-semibold">{t('dashboard.bestTime')}:</span>{' '}
            {t('dashboard.bestTimeHint', { time: formatHour(bestTime.data.suggestion) })}
            <span className="ml-2 text-slate-500 dark:text-slate-400">
              ({t('dashboard.quietHours')}:{' '}
              {bestTime.data.quietest.map((q) => formatHour(q.hour)).join(', ')})
            </span>
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.bestTimeNoData')}</p>
        )}
      </Card>

      {/* Charts */}
      {trend.isLoading || stats.isLoading ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <SkeletonPanel />
          <SkeletonPanel />
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          <ChartCard title={t('dashboard.attendanceTrend')} subtitle={t('dashboard.last14days')}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData}>
                <XAxis dataKey="label" tick={tickStyle} interval={1} />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.15)' }}
                  formatter={(v) => [Number(v) ? t('dashboard.present') : t('dashboard.absent'), '']}
                />
                <Bar dataKey="present" radius={[3, 3, 0, 0]} fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('dashboard.workoutMix')}>
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
                  <span key={d.type} className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: TYPE_COLORS[d.type] }} />
                    {t(`dashboard.types.${d.type}`)}
                  </span>
                ))}
              </div>
            )}
          </ChartCard>
        </section>
      )}

      {/* Quick log + recent */}
      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('dashboard.logWorkout')}>
          <LogWorkoutForm />
        </ChartCard>
        <ChartCard title={t('dashboard.recentWorkouts')}>
          {recent.data && recent.data.length > 0 ? (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.data.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: TYPE_COLORS[w.type] }} />
                    {t(`dashboard.types.${w.type}`)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
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
        </ChartCard>
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
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {t(`dashboard.types.${wt}`)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600 dark:text-slate-300">{t('dashboard.duration')}</label>
        <input
          type="number"
          min={1}
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          className={`${fieldClasses} w-24`}
        />
        <span className="text-sm text-slate-400 dark:text-slate-500">{t('dashboard.minutes')}</span>
      </div>
      <Button onClick={submit} disabled={logWorkout.isPending} className="w-full">
        {t('dashboard.log')}
      </Button>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </Card>
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
    <Card className="p-4">
      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
    </Card>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <Empty text={text} className="h-[180px]" />;
}
