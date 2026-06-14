import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarClock,
  BarChart3,
  User as UserIcon,
  Dumbbell,
  Bookmark,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useAuth } from '../features/auth/useAuth';
import type { Role } from '../features/auth/auth.types';
import { useRealtimeOccupancy } from '../lib/useRealtimeOccupancy';
import { usePreferenceSync } from '../lib/usePreferenceSync';
import { ContentLoader } from './page-loader';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { DensityToggle } from './density-toggle';

interface NavItem {
  to: string;
  labelKey: string;
  icon: ComponentType<{ size?: number }>;
  roles?: Role[]; // undefined = all roles
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/attendance', labelKey: 'nav.attendance', icon: CalendarCheck },
  { to: '/slots', labelKey: 'nav.slots', icon: CalendarClock },
  { to: '/bookings', labelKey: 'nav.bookings', icon: Bookmark, roles: ['MEMBER'] },
  { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart3, roles: ['TRAINER', 'ADMIN'] },
  { to: '/profile', labelKey: 'nav.profile', icon: UserIcon },
];

export function AppLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  useRealtimeOccupancy(); // live occupancy pushes while signed in
  usePreferenceSync(); // theme/density/locale follow the account

  const items = NAV_ITEMS.filter((i) => !i.roles || (user && i.roles.includes(user.role)));

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        {t('common.skipToContent')}
      </a>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Dumbbell size={22} className="text-brand-600 dark:text-brand-500" />
          <span className="bg-gradient-to-r from-brand-700 to-brand-400 bg-clip-text font-display text-lg font-bold tracking-tight text-transparent dark:from-brand-400 dark:to-brand-300">
            {t('app.name')}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <DensityToggle />
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-3 md:block dark:border-slate-800 dark:bg-slate-900">
          <nav className="space-y-1">
            {items.map((item) => (
              <NavItemLink key={item.to} item={item} />
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 pb-20 outline-none compact:p-3 md:p-8 md:pb-8 compact:md:p-6">
          <Suspense fallback={<ContentLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white md:hidden dark:border-slate-800 dark:bg-slate-900">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? 'text-brand-600 dark:text-brand-500' : 'text-slate-400 dark:text-slate-500'
              }`
            }
          >
            <item.icon size={20} />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function NavItemLink({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
          isActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        }`
      }
    >
      <item.icon size={18} />
      {t(item.labelKey)}
    </NavLink>
  );
}
