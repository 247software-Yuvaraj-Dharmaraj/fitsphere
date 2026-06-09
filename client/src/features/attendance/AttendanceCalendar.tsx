import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  year: number;
  month: number; // 1-12
  attendedDays: Set<string>; // YYYY-MM-DD
  onPrev: () => void;
  onNext: () => void;
  loading?: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function AttendanceCalendar({ year, month, attendedDays, onPrev, onNext, loading }: Props) {
  const { t, i18n } = useTranslation();
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startWeekday = firstDay.getUTCDay(); // 0 Sun
  const todayKey = new Date().toISOString().slice(0, 10);

  const monthLabel = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(firstDay);

  const cells: (number | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Localized single-letter weekday headers (Jan 7 2024 is a Sunday).
  const weekdayFmt = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
    weekday: 'narrow',
    timeZone: 'UTC',
  });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    weekdayFmt.format(new Date(Date.UTC(2024, 0, 7 + i))),
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={onPrev}
          aria-label={t('common.previous')}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{monthLabel}</span>
        <button
          onClick={onNext}
          aria-label={t('common.next')}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 dark:text-slate-500">
        {weekdays.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-7 gap-1 ${loading ? 'opacity-50' : ''}`}>
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = `${year}-${pad(month)}-${pad(day)}`;
          const attended = attendedDays.has(key);
          const isToday = key === todayKey;
          return (
            <div
              key={i}
              className={[
                'flex aspect-square items-center justify-center rounded-md text-sm',
                attended
                  ? 'bg-brand-500 font-semibold text-white'
                  : 'text-slate-600 dark:text-slate-300',
                isToday && !attended ? 'ring-2 ring-brand-500' : '',
              ].join(' ')}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
