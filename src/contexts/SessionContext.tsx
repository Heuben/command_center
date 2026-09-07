import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState } from
'react';
import type { UserAccount } from '../types';
import { users } from '../data/users';
import { REFERENCE_NOW } from '../utils/time';

/**
 * Mock password store for demo accounts.
 * In production, passwords would be hashed and validated server-side.
 * Keys are emails (lowercase); values are the demo passwords.
 */
const DEMO_PASSWORDS: Record<string, string> = {
  'r.alcantara@bantai.gov.ph': 'superadmin-2026',
  'e.reyes@brgy171.bantai.gov.ph': 'admin-171-2026'
};

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
  signIn: (email: string, password: string) => boolean;
  signOut: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** Superadmin-only branch filter. 'all' = system-wide. Admins are always pinned to their branch. */
  branchFilter: string;
  setBranchFilter: (id: string) => void;
  /** Resolved scope: a command_center_id, or null for system-wide. */
  scopeCenterId: string | null;
  isSuperadmin: boolean;
  now: number;
  sirenVolume: number;
  setSirenVolume: (v: number) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: {children: React.ReactNode;}) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [sirenVolume, setSirenVolume] = useState(70);
  const [now, setNow] = useState(REFERENCE_NOW);

  useEffect(() => {
    const id = window.setInterval(() => setNow((n) => n + 1000), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Persist theme so it survives reloads and shares across this app's tabs.
  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {

      /* storage unavailable — toggle still works for the current session */}
  }, [theme]);

  const signIn = useCallback((email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) return false;

    const match = users.find(
      (u) =>
      u.email.toLowerCase() === trimmedEmail && (
      u.role === 'admin' || u.role === 'superadmin')
    );
    if (!match) return false;

    // Deactivated users cannot sign in.
    if (match.account_status === 'deactivated') return false;

    // Validate password against mock credentials.
    const validPassword = DEMO_PASSWORDS[match.email.toLowerCase()];
    if (!validPassword || validPassword !== trimmedPassword) return false;

    setUser(match);
    setBranchFilter('all');
    return true;
  }, []);

  const signOut = useCallback(() => setUser(null), []);

  const isSuperadmin = user?.role === 'superadmin';
  const scopeCenterId = isSuperadmin ?
  branchFilter === 'all' ?
  null :
  branchFilter :
  user?.command_center_id ?? null;

  const value = useMemo<SessionValue>(
    () => ({
      user,
      signIn,
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
    [user, signIn, signOut, theme, branchFilter, scopeCenterId, isSuperadmin, now, sirenVolume]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}