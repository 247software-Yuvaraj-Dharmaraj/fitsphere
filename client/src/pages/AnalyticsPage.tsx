import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef, OnChangeFn, SortingState } from '@tanstack/react-table';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Search, Users, Activity, Clock, Gauge, Download } from 'lucide-react';
import { useAnalyticsOverview, useMembers } from '../features/analytics/analytics.hooks';
import { getMembers, type MemberRow, type MemberStatus } from '../features/analytics/analytics.api';
import { useDebounce } from '../lib/useDebounce';
import { downloadCsv } from '../lib/csv';
import { Button } from '../components/ui/button';
import { SkeletonCard, SkeletonPanel } from '../components/Skeleton';
import { PageHeader } from '../components/ui/page-header';
import { Card } from '../components/ui/card';
import { Badge, type BadgeTone } from '../components/ui/badge';
import { DataGrid } from '../components/ui/data-grid';
import { fieldClasses } from '../components/ui/field';

const STATUS_TONE: Record<MemberStatus, BadgeTone> = {
  ACTIVE: 'green',
  AT_RISK: 'amber',
  INACTIVE: 'red',
};
const tickStyle = { fontSize: 11, fill: '#94a3b8' };

export function AnalyticsPage() {
  const { t, i18n } = useTranslation();
  const overview = useAnalyticsOverview();

  const PAGE_SIZE = 10;
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalVisits', desc: true }]);
  const [page, setPage] = useState(0);
  const debounced = useDebounce(search, 300);

  // Reset to the first page whenever the search term changes.
  useEffect(() => setPage(0), [debounced]);

  const sortState = sorting[0] ?? { id: 'totalVisits', desc: true };
  const members = useMembers({
    q: debounced,
    page,
    pageSize: PAGE_SIZE,
    sort: sortState.id as 'name' | 'totalVisits' | 'thisWeek' | 'lastVisit' | 'status',
    dir: sortState.desc ? 'desc' : 'asc',
  });

  // Changing sort resets to the first page.
  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    setPage(0);
  };

  const [exporting, setExporting] = useState(false);
  async function exportCsv() {
    setExporting(true);
    try {
      const all = await getMembers({
        q: debounced,
        page: 0,
        pageSize: 100,
        sort: sortState.id as 'name' | 'totalVisits' | 'thisWeek' | 'lastVisit' | 'status',
        dir: sortState.desc ? 'desc' : 'asc',
      });
      downloadCsv(
        'fitsphere-members.csv',
        [
          { key: 'name', header: 'Name' },
          { key: 'email', header: 'Email' },
          { key: 'totalVisits', header: 'Total Visits' },
          { key: 'thisWeek', header: 'This Week' },
          { key: 'lastVisit', header: 'Last Visit' },
          { key: 'status', header: 'Status' },
        ],
        all.rows,
      );
    } finally {
      setExporting(false);
    }
  }

  const o = overview.data;
  const peakLabel = o?.totals.peakHour != null ? `${o.totals.peakHour}:00` : '—';
  const trendData = o?.dailyTrend.map((d) => ({ label: d.day.slice(5), count: d.count })) ?? [];

  const columns = useMemo<ColumnDef<MemberRow, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('analytics.member'),
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-700 dark:text-slate-200">{row.original.name}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">{row.original.email}</div>
          </div>
        ),
      },
      { accessorKey: 'totalVisits', header: t('analytics.visits') },
      { accessorKey: 'thisWeek', header: t('analytics.thisWeek') },
      {
        accessorKey: 'lastVisit',
        header: t('analytics.lastVisit'),
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v
            ? new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
                day: 'numeric',
                month: 'short',
              }).format(new Date(v))
            : t('analytics.never');
        },
      },
      {
        accessorKey: 'status',
        header: t('analytics.status'),
        cell: ({ getValue }) => {
          const s = getValue() as MemberStatus;
          return <Badge tone={STATUS_TONE[s]}>{t(`analytics.statuses.${s}`)}</Badge>;
        },
      },
    ],
    [t, i18n],
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t('pages.analytics.title')} subtitle={t('pages.analytics.subtitle')} />

      {/* KPIs */}
      {overview.isLoading ? (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi icon={<Users size={18} className="text-brand-600" />} label={t('analytics.totalMembers')} value={o ? `${o.totals.totalMembers}` : '—'} />
          <Kpi icon={<Activity size={18} className="text-green-600" />} label={t('analytics.activeThisWeek')} value={o ? `${o.totals.activeThisWeek}` : '—'} />
          <Kpi icon={<Clock size={18} className="text-orange-500" />} label={t('analytics.peakHour')} value={peakLabel} />
          <Kpi icon={<Gauge size={18} className="text-slate-500" />} label={t('analytics.currentOccupancy')} value={o ? `${o.occupancy.percent}%` : '—'} />
        </section>
      )}

      {/* Charts */}
      {overview.isLoading ? (
        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <SkeletonPanel height={220} />
          <SkeletonPanel height={220} />
        </section>
      ) : (
        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartCard title={t('analytics.peakHours')} subtitle={t('analytics.last30days')}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={o?.peakHours ?? []}>
                <XAxis dataKey="hour" tick={tickStyle} interval={2} />
                <YAxis tick={tickStyle} allowDecimals={false} width={24} />
                <Tooltip labelFormatter={(h) => `${h}:00`} formatter={(v) => [v, t('analytics.checkIns')]} cursor={{ fill: 'rgba(148,163,184,0.15)' }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.dailyTrend')} subtitle={t('analytics.last14days')}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <XAxis dataKey="label" tick={tickStyle} interval={1} />
                <YAxis tick={tickStyle} allowDecimals={false} width={24} />
                <Tooltip formatter={(v) => [v, t('analytics.checkIns')]} />
                <Area type="monotone" dataKey="count" stroke="#16a34a" fill="#16a34a" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>
      )}

      {/* Member directory + debounced search */}
      <section className="mt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('analytics.members')}
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute top-2.5 left-2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('analytics.searchPlaceholder')}
                aria-label={t('analytics.searchPlaceholder')}
                className={`${fieldClasses} pl-8`}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={exporting}>
              <Download size={14} />
              {t('analytics.exportCsv')}
            </Button>
          </div>
        </div>
        <DataGrid
          columns={columns}
          data={members.data?.rows ?? []}
          emptyText={t('analytics.noMembers')}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          loading={members.isFetching}
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total: members.data?.total ?? 0,
            onPageChange: setPage,
          }}
        />
      </section>
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

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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
