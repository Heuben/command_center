import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import type { UserAccount } from '../types';
import { api } from '../lib/api';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'bantai-theme';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'dark' || stored === 'light' ? stored : 'light';
  } catch {
    return 'light';
  }
}

type SessionValue = {
  user: UserAccount | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<UserAccount>;
  devLogin: () => Promise<UserAccount>;
  signOut: () => Promise<void>;
  theme: Theme;
  setTheme: (t: Theme) => void;
  branchFilter: string;
  setBranchFilter: (id: string) => void;
  scopeCenterId: string | null;
  isSuperadmin: boolean;
  now: number;
  sirenVolume: number;
  setSirenVolume: (v: number) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: {children: React.ReactNode;}) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [sirenVolume, setSirenVolume] = useState(70);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<UserAccount> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      throw new Error('Enter your email and password.');
    }
    try {
      const data = await api.login(trimmedEmail, trimmedPassword);
      // The login API now returns {accessToken, refreshToken}
      // The token is stored in localStorage by the api.request function
      // Now fetch the user data
      const userData = await api.me();
      if (!cancelled) setUser(userData.user);
      setBranchFilter('all');
      return userData.user;
    } catch (error: any) {
      // Re-throw the error so the calling component can handle it
      throw error;
    }
  }, []);

  const devLogin = useCallback(async (): Promise<UserAccount> => {
    if (!import.meta.env.DEV) throw new Error('Development mode is disabled.');
    try {
      const data = await api.devLogin();
      // Fetch user data after dev login as well
      const userData = await api.me();
      if (!cancelled) setUser(userData.user);
      setBranchFilter('all');
      return userData.user;
    } catch (error: any) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* session already gone */
    }
    // Clear the access token from localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('bantai-access-token');
      } catch {
        /* storage unavailable */
      }
    }
    setUser(null);
  }, []);

  const isSuperadmin = user?.role === 'superadmin';
  const scopeCenterId = isSuperadmin ?
  branchFilter === 'all' ?
  null :
  branchFilter :
  user?.command_center_id ?? null;

  const value = useMemo<SessionValue>(
    () => ({
      user,
      ready,
      signIn,
      devLogin,
      signOut,
      theme,
      setTheme,
      branchFilter,
      setBranchFilter,
      scopeCenterId,
      isSuperadmin: !!isSuperadmin,
      now,
      sirenVolume,
      setSirenVolume
    }),
    [user, ready, signIn, devLogin, signOut, theme, branchFilter, scopeCenterId, isSuperadmin, now, sirenVolume]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}