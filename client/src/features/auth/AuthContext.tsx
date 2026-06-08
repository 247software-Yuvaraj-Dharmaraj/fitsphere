import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthLogout } from '../../lib/api';
import { tokenStore } from '../../lib/tokens';
import * as authApi from './auth.api';
import type { SigninPayload, SignupPayload, User } from './auth.types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signin: (payload: SigninPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  signout: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: if a token exists, resolve the current user (with cancellation).
  useEffect(() => {
    const controller = new AbortController();
    async function bootstrap() {
      if (!tokenStore.getAccess()) {
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.fetchMe(controller.signal);
        setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
    return () => controller.abort();
  }, []);

  // React to a failed token refresh (fired by the axios interceptor).
  useEffect(() => {
    const handler = () => setUser(null);
    onAuthLogout.addEventListener('logout', handler);
    return () => onAuthLogout.removeEventListener('logout', handler);
  }, []);

  const signin = useCallback(async (payload: SigninPayload) => {
    const res = await authApi.signin(payload);
    setUser(res.user);
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    const res = await authApi.signup(payload);
    setUser(res.user);
  }, []);

  const signout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signin, signup, signout }),
    [user, loading, signin, signup, signout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
