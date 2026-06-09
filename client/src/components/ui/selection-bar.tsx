import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface SelectionBarProps {
  count: number;
  onClear: () => void;
  children: ReactNode; // mass-action buttons
}

/** Floating bar shown when grid rows are selected (mass actions). */
export function SelectionBar({ count, onClear, children }: SelectionBarProps) {
  const { t } = useTranslation();
  if (count === 0) return null;
  return (
    <div className="mb-3 flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm shadow-sm dark:border-brand-500/30 dark:bg-brand-500/10">
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-2 text-xs font-semibold text-white">
        {count}
      </span>
      <span className="text-slate-700 dark:text-slate-200">{t('common.selected')}</span>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <button
          onClick={onClear}
          className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {t('common.clear')}
        </button>
      </div>
    </div>
  );
}
