import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

// Top-level boundary so a render crash shows a friendly fallback instead of a
// blank white screen.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[error-boundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return <ErrorFallback />;
    return this.props.children;
  }
}

function ErrorFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center dark:bg-slate-950">
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
        {t('common.errorTitle')}
      </h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {t('common.errorMessage')}
      </p>
      <Button onClick={() => window.location.reload()}>{t('common.reload')}</Button>
    </div>
  );
}
