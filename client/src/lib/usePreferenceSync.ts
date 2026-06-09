import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/useAuth';
import { useTheme } from '../context/theme-context';
import { useDensity } from '../context/density-context';
import { updatePreferences } from '../features/auth/auth.api';
import type { UserPreferences } from '../features/auth/auth.types';

// Keeps UI preferences (theme/density/locale) in sync with the user's account:
// hydrate from the server on login, and persist back when the user changes one.
export function usePreferenceSync() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';

  const serverPrefs = useRef<UserPreferences | null>(null);
  const hydratedFor = useRef<string | null>(null);

  // Hydrate once per login: apply the account's saved preferences.
  useEffect(() => {
    if (!user) {
      hydratedFor.current = null;
      serverPrefs.current = null;
      return;
    }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    serverPrefs.current = user.preferences;
    if (user.preferences.theme !== theme) setTheme(user.preferences.theme);
    if (user.preferences.density !== density) setDensity(user.preferences.density);
    if (user.preferences.locale !== locale) i18n.changeLanguage(user.preferences.locale);
  }, [user, theme, density, locale, setTheme, setDensity, i18n]);

  // Persist when the user changes a preference (after hydration).
  useEffect(() => {
    const sp = serverPrefs.current;
    if (!user || !sp) return;
    if (sp.theme === theme && sp.density === density && sp.locale === locale) return;
    serverPrefs.current = { theme, density, locale };
    void updatePreferences({ theme, density, locale }).catch(() => {});
  }, [user, theme, density, locale]);
}
