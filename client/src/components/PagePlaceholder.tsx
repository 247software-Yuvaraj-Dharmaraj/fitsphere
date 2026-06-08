import { useTranslation } from 'react-i18next';

// Temporary scaffold for feature pages built out in Week 2.
export function PagePlaceholder({ titleKey, subtitleKey }: { titleKey: string; subtitleKey: string }) {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">{t(titleKey)}</h1>
      <p className="mt-1 text-slate-500">{t(subtitleKey)}</p>
      <div className="mt-8 flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
        {t('common.comingSoon')}
      </div>
    </div>
  );
}
