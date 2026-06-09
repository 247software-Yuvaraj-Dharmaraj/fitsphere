import { useTranslation } from 'react-i18next';
import { Rows2, Rows3 } from 'lucide-react';
import { useDensity } from '../context/density-context';
import { Tooltip } from './ui/tooltip';

export function DensityToggle() {
  const { t } = useTranslation();
  const { density, toggleDensity } = useDensity();
  const label = density === 'compact' ? t('common.comfortable') : t('common.compact');
  return (
    <Tooltip label={label}>
      <button
        onClick={toggleDensity}
        aria-label={label}
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        {density === 'compact' ? <Rows3 size={16} /> : <Rows2 size={16} />}
      </button>
    </Tooltip>
  );
}
