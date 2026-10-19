import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CommandCenter } from '../types';
import { api } from '../lib/api';
import { useSession } from './SessionContext';

type CommandCenterContextValue = {
  commandCenters: CommandCenter[];
  ready: boolean;
  refresh: () => Promise<void>;
  centerById: (id: string | null | undefined) => CommandCenter | undefined;
  centerName: (id: string | null | undefined) => string;
};

const CommandCenterContext = createContext<CommandCenterContextValue | null>(null);

export function CommandCentersProvider({ children }: { children: React.ReactNode }) {
  const { user, isSuperadmin } = useSession();
  const [commandCenters, setCommandCenters] = useState<CommandCenter[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !isSuperadmin) {
      setCommandCenters([]);
      setReady(true);
      return;
    }

    setReady(false);
    try {
      const data = await api.getCommandCenters();
      setCommandCenters(data);
      if (typeof window !== 'undefined') {
        (window as any).__bantaiDebug = {
          ...(window as any).__bantaiDebug,
          commandCenters: data,
          commandCentersFetchedAt: new Date().toISOString(),
          commandCenterUserRole: user.role,
        };
      }
      console.debug('[bantai:command-centers] loaded', data);
    } catch (error) {
      setCommandCenters([]);
      console.error('[bantai:command-centers] failed', error);
    } finally {
      setReady(true);
    }
  }, [isSuperadmin, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const centerById = useCallback(
    (id: string | null | undefined) => {
      if (!id) return undefined;
      return commandCenters.find((center) => center.id === id);
    },
    [commandCenters]
  );

  const centerName = useCallback(
    (id: string | null | undefined) => centerById(id)?.name ?? 'System-wide',
    [centerById]
  );

  const value = useMemo<CommandCenterContextValue>(
    () => ({
      commandCenters,
      ready,
      refresh,
      centerById,
      centerName,
    }),
    [commandCenters, ready, refresh, centerById, centerName]
  );

  return <CommandCenterContext.Provider value={value}>{children}</CommandCenterContext.Provider>;
}

export function useCommandCenters(): CommandCenterContextValue {
  const ctx = useContext(CommandCenterContext);
  if (!ctx) throw new Error('useCommandCenters must be used inside CommandCentersProvider');
  return ctx;
}
