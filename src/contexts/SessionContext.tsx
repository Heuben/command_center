import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import type { UserAccount } from '../types';
import { api, AUTH_TOKENS_REFRESHED_EVENT, SESSION_EXPIRED_EVENT } from '../lib/api';

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
  const [socketTokenVersion, setSocketTokenVersion] = useState(0);

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
    const onTokensRefreshed = () => setSocketTokenVersion((version) => version + 1);
    const onSessionExpired = () => setUser(null);
    window.addEventListener(AUTH_TOKENS_REFRESHED_EVENT, onTokensRefreshed);
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => {
      window.removeEventListener(AUTH_TOKENS_REFRESHED_EVENT, onTokensRefreshed);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let hasStoredTokens = false;
    try {
      hasStoredTokens = !!(
        window.localStorage.getItem('bantai-access-token') ||
        window.localStorage.getItem('bantai-refresh-token')
      );
    } catch {
      hasStoredTokens = false;
    }

    if (!hasStoredTokens) {
      setReady(true);
      return;
    }

    api
      .me()
      .then((data) => {
        if (!cancelled) {
          setUser(data.user);
          if (data.user.role !== 'superadmin' && data.user.command_center_id) {
            setBranchFilter(data.user.command_center_id);
          }
        }
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

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'superadmin' && user.command_center_id) {
      setBranchFilter((current) => (current === 'all' || !current ? user.command_center_id ?? 'all' : current));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const accessToken = window.localStorage.getItem('bantai-access-token');
    if (!accessToken) return;

    console.debug('[socket:incidents] attempting connection');
    const incidentsSocket = io('https://www.bantai.online/incidents', {
      auth: { token: accessToken }
    });
    const handleConnect = () => {
      console.info('[socket:incidents] connected', incidentsSocket.id);
    };
    const handleConnectError = (error: Error) => {
      console.error('[socket:incidents] connection error', error.message);
    };
    const handleDisconnect = (reason: string) => {
      console.warn('[socket:incidents] disconnected', reason);
    };
    const handleReconnectAttempt = (attempt: number) => {
      console.debug('[socket:incidents] reconnect attempt', attempt);
    };

    incidentsSocket.on('connect', handleConnect);
    incidentsSocket.on('connect_error', handleConnectError);
    incidentsSocket.on('disconnect', handleDisconnect);
    incidentsSocket.io.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      incidentsSocket.off('connect', handleConnect);
      incidentsSocket.off('connect_error', handleConnectError);
      incidentsSocket.off('disconnect', handleDisconnect);
      incidentsSocket.io.off('reconnect_attempt', handleReconnectAttempt);
      incidentsSocket.disconnect();
    };
  }, [user?.id, socketTokenVersion]);

  const signIn = useCallback(async (email: string, password: string): Promise<UserAccount> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      throw new Error('Enter your email and password.');
    }
    try {
      const data = await api.login(trimmedEmail, trimmedPassword);
      // Store the access token in localStorage for use in subsequent requests
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('bantai-access-token', data.accessToken);
          window.localStorage.setItem('bantai-refresh-token', data.refreshToken);
        } catch {
          /* storage unavailable */
        }
      }
      // Now fetch the user data
      const userData = await api.me();
      setUser(userData.user);
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
      // Store the access token in localStorage for use in subsequent requests
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('bantai-access-token', data.accessToken);
          window.localStorage.setItem('bantai-refresh-token', data.refreshToken);
        } catch {
          /* storage unavailable */
        }
      }
      // Fetch user data after dev login as well
      const userData = await api.me();
      setUser(userData.user);
      setBranchFilter(userData.user.role === 'superadmin' ? 'all' : userData.user.command_center_id ?? 'all');
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
        window.localStorage.removeItem('bantai-refresh-token');
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
