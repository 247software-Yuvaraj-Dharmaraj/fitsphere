import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';

// Avatar + name button that opens a dropdown (profile / sign out) — mirrors
// ui-service's header user menu.
export function UserMenu() {
  const { t } = useTranslation();
  const { user, signout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!user) return null;
  const initials = user.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleSignout() {
    setOpen(false);
    await signout();
    navigate('/login', { replace: true });
  }

  const itemClass =
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none dark:hover:bg-slate-800"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
          {initials}
        </span>
        <span className="hidden text-sm text-slate-700 sm:inline dark:text-slate-200">
          {user.name}
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {user.name}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            <span className="mt-1 inline-block text-xs text-slate-400 dark:text-slate-500">
              {t(`roles.${user.role}`)}
            </span>
          </div>
          <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate('/profile');
            }}
            className={itemClass}
          >
            <UserIcon size={15} />
            {t('nav.profile')}
          </button>
          <button role="menuitem" onClick={handleSignout} className={itemClass}>
            <LogOut size={15} />
            {t('auth.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
