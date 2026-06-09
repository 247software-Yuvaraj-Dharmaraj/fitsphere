import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/useAuth';
import { updatePreferences } from '../features/auth/auth.api';

// Syncs the user's LOCALE with their account: hydrate from the account on login,
// persist back on change. Theme and density are intentionally device-local
// (localStorage) — syncing them across loads/accounts causes a visible flip on
// reload, and they're conventionally per-device preferences.
export function usePreferenceSync() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';

  const serverLocale = useRef<string | null>(null);
  const hydratedFor = useRef<string | null>(null);

  // Hydrate locale once per login.
  useEffect(() => {
    if (!user) {
      hydratedFor.current = null;
      serverLocale.current = null;
      return;
    }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    serverLocale.current = user.preferences.locale;
    if (user.preferences.locale !== locale) i18n.changeLanguage(user.preferences.locale);
  }, [user, locale, i18n]);

  // Persist locale changes back to the account.
  useEffect(() => {
    if (!user || serverLocale.current === null) return;
    if (serverLocale.current === locale) return;
    serverLocale.current = locale;
    void updatePreferences({ locale }).catch(() => {});
  }, [user, locale]);
}
