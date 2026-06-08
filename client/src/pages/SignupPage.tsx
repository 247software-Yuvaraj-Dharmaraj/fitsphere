import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../features/auth/useAuth';
import { getApiErrorMessage } from '../lib/api';
import type { Role } from '../features/auth/auth.types';
import { AuthShell, Field, inputClass, buttonClass } from './LoginPage';

const ROLES: Role[] = ['MEMBER', 'TRAINER', 'ADMIN'];

export function SignupPage() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    role: 'MEMBER' as Role,
  });
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signup({
        name: form.name,
        email: form.email,
        mobile: form.mobile || undefined,
        password: form.password,
        role: form.role,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Sign up failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title={t('auth.createAccount')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('auth.name')}>
          <input
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t('auth.email')}>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </Field>
        <Field label={t('auth.mobile')}>
          <input
            value={form.mobile}
            onChange={(e) => update('mobile', e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t('auth.password')}>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
        </Field>
        <Field label={t('auth.role')}>
          <select
            value={form.role}
            onChange={(e) => update('role', e.target.value as Role)}
            className={inputClass}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" disabled={submitting} className={buttonClass}>
          {submitting ? t('auth.creatingAccount') : t('auth.signUp')}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </AuthShell>
  );
}
