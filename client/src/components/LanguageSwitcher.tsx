import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? 'en';

  return (
    <label className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
      <Languages size={16} />
      <select
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </label>
  );
}
