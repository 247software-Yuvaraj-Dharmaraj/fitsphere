import { Dumbbell, Loader2 } from 'lucide-react';

/** Full-screen branded loader — initial app load / auth bootstrap. */
export function FullPageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center gap-2 text-brand-600 dark:text-brand-500">
        <Dumbbell size={30} className="fs-logo-pulse" />
        <span className="text-2xl font-bold">FitSphere</span>
      </div>
      <Loader2 size={24} className="animate-spin text-brand-500" />
    </div>
  );
}

/** In-content loader — keeps the app shell while a page chunk loads. */
export function ContentLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 size={26} className="animate-spin text-brand-500" />
    </div>
  );
}
