import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Search, Users, Activity, Clock, Gauge } from 'lucide-react';
import { useAnalyticsOverview, useMembers } from '../features/analytics/analytics.hooks';
import type { MemberStatus } from '../features/analytics/analytics.api';
import { useDebounce } from '../lib/useDebounce';

const STATUS_STYLES: Record<MemberStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  AT_RISK: 'bg-amber-100 text-amber-700',
  INACTIVE: 'bg-red-100 text-red-700',
};

export function AnalyticsPage() {
  const { t, i18n } = useTranslation();
  const overview = useAnalyticsOverview();

  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const members = useMembers(debounced);

  const o = overview.data;
  const peakLabel = o?.totals.peakHour != null ? `${o.totals.peakHour}:00` : '—';
  const trendData = o?.dailyTrend.map((d) => ({ label: d.day.slice(5), count: d.count })) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">{t('pages.analytics.title')}</h1>
        <p className="mt-1 text-slate-500">{t('pages.analytics.subtitle')}</p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Users size={18} className="text-brand-600" />} label={t('analytics.totalMembers')} value={o ? `${o.totals.totalMembers}` : '—'} />
        <Kpi icon={<Activity size={18} className="text-green-600" />} label={t('analytics.activeThisWeek')} value={o ? `${o.totals.activeThisWeek}` : '—'} />
        <Kpi icon={<Clock size={18} className="text-orange-500" />} label={t('analytics.peakHour')} value={peakLabel} />
        <Kpi icon={<Gauge size={18} className="text-slate-600" />} label={t('analytics.currentOccupancy')} value={o ? `${o.occupancy.percent}%` : '—'} />
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card title={t('analytics.peakHours')} subtitle={t('analytics.last30days')}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={o?.peakHours ?? []}>
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} tickFormatter={(h) => `${h}`} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={24} />
              <Tooltip
                labelFormatter={(h) => `${h}:00`}
                formatter={(v) => [v, t('analytics.checkIns')]}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title={t('analytics.dailyTrend')} subtitle={t('analytics.last14days')}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={24} />
              <Tooltip formatter={(v) => [v, t('analytics.checkIns')]} />
              <Area type="monotone" dataKey="count" stroke="#16a34a" fill="#dcfce7" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* Member directory + debounced search */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700">{t('analytics.members')}</h2>
          <div className="relative">
            <Search size={15} className="absolute left-2 top-2.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('analytics.searchPlaceholder')}
              className="rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className={`overflow-x-auto ${members.isFetching ? 'opacity-60' : ''}`}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr>
                <th className="py-2">{t('analytics.member')}</th>
                <th className="py-2">{t('analytics.visits')}</th>
                <th className="py-2">{t('analytics.thisWeek')}</th>
                <th className="py-2">{t('analytics.lastVisit')}</th>
                <th className="py-2">{t('analytics.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.data && members.data.length > 0 ? (
                members.data.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2">
                      <div className="font-medium text-slate-700">{m.name}</div>
                      <div className="text-xs text-slate-400">{m.email}</div>
                    </td>
                    <td className="py-2 text-slate-600">{m.totalVisits}</td>
                    <td className="py-2 text-slate-600">{m.thisWeek}</td>
                    <td className="py-2 text-slate-500">
                      {m.lastVisit
                        ? new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
                            day: 'numeric',
                            month: 'short',
                          }).format(new Date(m.lastVisit))
                        : t('analytics.never')}
                    </td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status]}`}>
                        {t(`analytics.statuses.${m.status}`)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {t('analytics.noMembers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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
