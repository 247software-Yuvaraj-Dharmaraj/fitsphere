import { Rows2, Rows3 } from 'lucide-react';
import { useDensity } from '../context/density-context';

export function DensityToggle() {
  const { density, toggleDensity } = useDensity();
  return (
    <button
      onClick={toggleDensity}
      aria-label="Toggle density"
      title={density === 'compact' ? 'Comfortable' : 'Compact'}
      className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      {density === 'compact' ? <Rows3 size={16} /> : <Rows2 size={16} />}
    </button>
  );
}
