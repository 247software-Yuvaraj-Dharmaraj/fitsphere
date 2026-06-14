import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/useAuth';
import { updatePreferences } from '../features/auth/auth.api';
import { useTheme } from '../context/theme-context';
import { useDensity } from '../context/density-context';

// Syncs the user's preferences (locale, theme, density) with their ACCOUNT:
// hydrate from the account once per login, then persist changes back. Keeping
// these per-account means a different user signing in on the same device gets
// their OWN theme/density instead of inheriting whatever the previous user left
// in localStorage. localStorage still drives the pre-paint theme, so a returning
// same user doesn't see a flip on reload (it already matches their account).
export function usePreferenceSync() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const locale = i18n.resolvedLanguage ?? 'en';

  // Last value known to match the server, so we only PATCH genuine user changes
  // (not the hydration write). hydratedFor gates one hydration per login.
  const hydratedFor = useRef<string | null>(null);
  const serverLocale = useRef<string | null>(null);
  const serverTheme = useRef<string | null>(null);
  const serverDensity = useRef<string | null>(null);

  // Hydrate locale + theme + density once per login from the account.
  useEffect(() => {
    if (!user) {
      hydratedFor.current = null;
      serverLocale.current = null;
      serverTheme.current = null;
      serverDensity.current = null;
      return;
    }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    serverLocale.current = user.preferences.locale;
    serverTheme.current = user.preferences.theme;
    serverDensity.current = user.preferences.density;
    if (user.preferences.locale !== locale) i18n.changeLanguage(user.preferences.locale);
    if (user.preferences.theme !== theme) setTheme(user.preferences.theme);
    if (user.preferences.density !== density) setDensity(user.preferences.density);
  }, [user, locale, theme, density, i18n, setTheme, setDensity]);

  // Persist locale changes back to the account.
  useEffect(() => {
    if (!user || serverLocale.current === null || serverLocale.current === locale) return;
    serverLocale.current = locale;
    void updatePreferences({ locale }).catch(() => {});
  }, [user, locale]);

  // Persist theme changes back to the account.
  useEffect(() => {
    if (!user || serverTheme.current === null || serverTheme.current === theme) return;
    serverTheme.current = theme;
    void updatePreferences({ theme }).catch(() => {});
  }, [user, theme]);

  // Persist density changes back to the account.
  useEffect(() => {
    if (!user || serverDensity.current === null || serverDensity.current === density) return;
    serverDensity.current = density;
    void updatePreferences({ density }).catch(() => {});
  }, [user, density]);
}
