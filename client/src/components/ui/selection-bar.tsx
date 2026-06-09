import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MousePointer2 } from 'lucide-react';

interface SelectionBarProps {
  count: number;
  onClear: () => void;
  onSelectAll?: () => void;
  children: ReactNode; // mass-action buttons (e.g. Delete)
}

/** Mass-action bar shown when grid rows are selected — mirrors ui-service's
 *  SelectionBar: count tag, "selected" label, optional Select all, a divider,
 *  the action buttons, then Clear. */
export function SelectionBar({ count, onClear, onSelectAll, children }: SelectionBarProps) {
  const { t } = useTranslation();
  if (count === 0) return null;

  const divider = <div className="h-6 w-px bg-brand-200 dark:bg-brand-500/30" />;

  return (
    <div className="mb-3 flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm shadow-sm dark:border-brand-500/30 dark:bg-brand-500/10">
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-2 text-xs font-semibold text-white dark:bg-brand-500">
        {count}
      </span>
      <span className="text-slate-700 dark:text-slate-200">{t('common.selected')}</span>

      {onSelectAll && (
        <>
          {divider}
          <button
            onClick={onSelectAll}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-brand-700 hover:bg-brand-100 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none dark:text-brand-300 dark:hover:bg-brand-500/15"
          >
            <MousePointer2 size={14} />
            {t('common.selectAll')}
          </button>
        </>
      )}

      {divider}
      <div className="flex items-center gap-2">{children}</div>

      <button
        onClick={onClear}
        className="ml-auto rounded-md px-2 py-1 text-slate-500 hover:bg-brand-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-brand-500/15 dark:hover:text-slate-100"
      >
        {t('common.clear')}
      </button>
    </div>
  );
}
