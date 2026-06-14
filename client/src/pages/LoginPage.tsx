import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dumbbell, Mail, Lock, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../features/auth/useAuth';
import { getApiErrorMessage } from '../lib/api';
import { TextField } from '../components/ui/text-field';
import { Button } from '../components/ui/button';

export function LoginPage() {
  const { t } = useTranslation();
  const { signin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('password123');
  }

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';

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
        <TextField
          label={t('auth.email')}
          icon={<Mail size={16} />}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <TextField
          label={t('auth.password')}
          icon={<Lock size={16} />}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Button type="submit" loading={submitting} className="w-full">
          {!submitting && <LogIn size={16} />}
          {submitting ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('auth.noAccount')}{' '}
        <Link to="/signup" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          {t('auth.signUp')}
        </Link>
      </p>
      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">{t('auth.demoHint')}</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          {[
            { role: 'MEMBER', email: 'member@fitsphere.app' },
            { role: 'TRAINER', email: 'trainer@fitsphere.app' },
            { role: 'ADMIN', email: 'admin@fitsphere.app' },
          ].map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => fillDemo(d.email)}
              title={`${d.email} / password123`}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-brand-400"
            >
              {t(`roles.${d.role}`)}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-300/30 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40">
        <div className="mb-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Dumbbell size={26} className="text-brand-600 dark:text-brand-500" />
            <span className="bg-gradient-to-r from-brand-700 to-brand-400 bg-clip-text font-display text-2xl font-bold tracking-tight text-transparent dark:from-brand-400 dark:to-brand-300">
              {t('app.name')}
            </span>
          </div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
