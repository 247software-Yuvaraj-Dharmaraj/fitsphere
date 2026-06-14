import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/theme-context';
import { Tooltip } from './ui/tooltip';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? t('common.lightMode') : t('common.darkMode');
  return (
    <Tooltip label={label} side="bottom">
      <button
        onClick={toggleTheme}
        aria-label={label}
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </Tooltip>
  );
}
