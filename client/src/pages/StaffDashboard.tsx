import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Activity, UserMinus, Clock, CalendarClock, LayoutDashboard, Gauge } from 'lucide-react';
import { useAnalyticsOverview } from '../features/analytics/analytics.hooks';
import { useSlots } from '../features/slots/slots.hooks';
import type { CrowdLevel } from '../features/attendance/attendance.api';
import { useChartTooltip } from '../lib/useChartTooltip';
import { PageHeader } from '../components/ui/page-header';
import { Card } from '../components/ui/card';
import { Badge, type BadgeTone } from '../components/ui/badge';
import { Empty } from '../components/ui/empty';
import { Skeleton, SkeletonCard, SkeletonPanel } from '../components/Skeleton';

const tickStyle = { fontSize: 11, fill: '#94a3b8' };
const LEVEL_TONE: Record<CrowdLevel, BadgeTone> = {
  LOW: 'green',
  MEDIUM: 'amber',
  HIGH: 'orange',
  FULL: 'red',
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Operational "at a glance today" dashboard for TRAINER/ADMIN — live occupancy,
 *  member KPIs, today's classes, and the recent gym-wide check-in trend. Pairs
 *  with the Analytics page (the deep historical + member-directory view). */
export function StaffDashboard() {
  const { t, i18n } = useTranslation();
  const overview = useAnalyticsOverview();
  const today = useSlots(todayKey());
  const tooltip = useChartTooltip();

  const o = overview.data;
  const occ = o?.occupancy;
  const peakLabel = o?.totals.peakHour != null ? `${o.totals.peakHour}:00` : '—';
  const inactive = o ? Math.max(0, o.totals.totalMembers - o.totals.activeThisWeek) : 0;
  const trendData = o?.dailyTrend.map((d) => ({ label: d.day.slice(5), date: d.day, count: d.count })) ?? [];
  const slots = today.data?.slots ?? [];

  const fmtTrendDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        icon={<LayoutDashboard size={24} />}
        title={t('pages.dashboard.title')}
        subtitle={t('pages.dashboard.staffSubtitle')}
      />

      {/* Live occupancy hero */}
      {overview.isLoading ? (
        <SkeletonPanel height={64} />
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-brand-100 bg-brand-50 p-5 dark:border-brand-500/20 dark:bg-brand-500/10">
          <div className="flex items-center gap-3">
            <Gauge size={22} className="text-brand-600 dark:text-brand-400" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.staff.liveOccupancy')}</p>
              <p className="font-display text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {occ ? `${occ.activeCount} / ${occ.capacity}` : '—'}{' '}
                <span className="text-sm font-medium text-slate-400">{t('attendance.inGym')}</span>
              </p>
            </div>
          </div>
          {occ && (
            <Badge tone={LEVEL_TONE[occ.level]}>
              {t(`attendance.levels.${occ.level}`)} · {occ.percent}%
            </Badge>
          )}
          {occ && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/60 dark:bg-slate-800">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${occ.percent}%` }} />
            </div>
          )}
        </Card>
      )}

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {overview.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <Kpi icon={<Users size={18} className="text-brand-600" />} label={t('analytics.totalMembers')} value={o ? `${o.totals.totalMembers}` : '—'} />
            <Kpi icon={<Activity size={18} className="text-green-600" />} label={t('analytics.activeThisWeek')} value={o ? `${o.totals.activeThisWeek}` : '—'} />
            <Kpi icon={<UserMinus size={18} className="text-orange-500" />} label={t('dashboard.staff.inactiveThisWeek')} value={o ? `${inactive}` : '—'} />
            <Kpi icon={<Clock size={18} className="text-slate-500" />} label={t('analytics.peakHour')} value={peakLabel} />
          </>
        )}
      </section>

      {/* Today's classes + check-in trend */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title={t('dashboard.staff.todaysClasses')} icon={<CalendarClock size={16} />}>
          {today.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <Empty
              text={t('dashboard.staff.noClassesToday')}
              icon={<CalendarClock size={28} className="opacity-60" />}
              className="h-[160px]"
            />
          ) : (
            <ul className="space-y-3">
              {slots.map((s) => {
                const pct = Math.min(100, Math.round((s.bookedCount / s.capacity) * 100));
                return (
                  <li key={s.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                        {s.startTime} – {s.endTime}
                        {s.isFull && <Badge tone="red">{t('dashboard.staff.full')}</Badge>}
                        {s.waitlistCount > 0 && <Badge tone="amber">{t('slots.waiting', { count: s.waitlistCount })}</Badge>}
                      </span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">
                        {s.bookedCount}/{s.capacity}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title={t('dashboard.staff.checkInTrend')} subtitle={t('analytics.last14days')}>
          {overview.isLoading ? (
            <Skeleton className="w-full" style={{ height: 200 }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <XAxis dataKey="label" tick={tickStyle} interval={1} />
                <YAxis tick={tickStyle} allowDecimals={false} width={24} />
                <Tooltip
                  {...tooltip}
                  labelFormatter={(_, payload) => {
                    const iso = payload?.[0]?.payload?.date as string | undefined;
                    return iso ? fmtTrendDate(iso) : '';
                  }}
                  formatter={(v) => [v, t('analytics.checkIns')]}
                />
                <Area type="monotone" dataKey="count" stroke="#16a34a" fill="#16a34a" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </section>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon && <span className="text-brand-600 dark:text-brand-400">{icon}</span>}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{value}</div>
    </Card>
  );
}
