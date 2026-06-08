import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../features/auth/useAuth';
import { getApiErrorMessage } from '../lib/api';

export function LoginPage() {
  const { t } = useTranslation();
  const { signin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signin({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Sign in failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title={t('auth.welcomeBack')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('auth.email')}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </Field>
        <Field label={t('auth.password')}>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete="current-password"
          />
        </Field>
        <button type="submit" disabled={submitting} className={buttonClass}>
          {submitting ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        {t('auth.noAccount')}{' '}
        <Link to="/signup" className="font-medium text-brand-600 hover:underline">
          {t('auth.signUp')}
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-400">{t('auth.demoHint')}</p>
    </AuthShell>
  );
}

// ---- shared bits (also used by SignupPage) ----
export const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';
export const buttonClass =
  'w-full rounded-md bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-brand-700">
            <Dumbbell size={26} />
            <span className="text-xl font-bold">{t('app.name')}</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
