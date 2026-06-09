import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import type { FeedbackItem } from './feedback.api';

export function FeedbackTimeline({
  items,
  loading,
  emptyText,
}: {
  items: FeedbackItem[] | undefined;
  loading?: boolean;
  emptyText: string;
}) {
  const { t, i18n } = useTranslation();

  if (loading) return <p className="text-sm text-slate-400 dark:text-slate-500">{t('common.loading')}</p>;
  if (!items || items.length === 0)
    return <p className="text-sm text-slate-400 dark:text-slate-500">{emptyText}</p>;

  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-700">
      {items.map((f) => (
        <li key={f.id} className="relative">
          <span className="absolute -left-[26px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            <MessageSquare size={10} />
          </span>
          <p className="text-sm text-slate-700 dark:text-slate-200">{f.note}</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {f.trainerName} ·{' '}
            {new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            }).format(new Date(f.weekOf))}
          </p>
        </li>
      ))}
    </ol>
  );
}
