import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import type {
  Alert,
  AlertOutcomeReview,
  AppState,
  CommandCenter,
  IncidentReport,
  ReviewStatus,
  UserAccount
} from '../types';
import { api } from '../lib/api';
import { useSession } from './SessionContext';

const EMPTY: AppState = {
  users: [],
  commandCenters: [],
  alerts: [],
  branchResponses: [],
  assignments: [],
  reviews: [],
  civilianReports: [],
  reports: [],
  logs: [],
  devices: []
};

type DispatchValue = AppState & {
  ready: boolean;
  userList: UserAccount[];
  userById: (id: string | null | undefined) => UserAccount | undefined;
  userName: (id: string | null | undefined) => string;
  centerById: (id: string | null | undefined) => CommandCenter | undefined;
  centerName: (id: string | null | undefined) => string;
  alertById: (id: string) => Alert | undefined;
  refresh: () => Promise<void>;
  acknowledge: (alertId: string, centerId: string, actorId: string) => Promise<void>;
  dispatchResponders: (
    alertId: string,
    centerId: string,
    responderIds: string[],
    actorId: string,
    leadId: string | null
  ) => Promise<void>;
  reassignResponder: (
    declinedAssignmentId: string,
    newResponderId: string,
    actorId: string
  ) => Promise<void>;
  resolveBranch: (alertId: string, centerId: string, actorId: string) => Promise<void>;
  reviewOutcome: (
    reviewId: string,
    decision: Exclude<ReviewStatus, 'pending'>,
    actorId: string,
    notes: string
  ) => Promise<void>;
  acknowledgeCivilianReport: (reportId: string, actorId: string) => Promise<void>;
  createUser: (
    user: Omit<UserAccount, 'id'>,
    actorId: string
  ) => Promise<{user: UserAccount;tempPassword: string;}>;
  updateUser: (id: string, patch: Partial<UserAccount>, actorId: string) => Promise<void>;
  updateReport: (
    reportId: string,
    patch: Partial<IncidentReport>,
    actorId: string
  ) => Promise<IncidentReport | null>;
  createCenter: (input: Omit<CommandCenter, 'id' | 'created_at'>) => Promise<CommandCenter>;
  updateCenter: (id: string, patch: Partial<CommandCenter>) => Promise<void>;
  deleteCenter: (id: string) => Promise<void>;
};

const DispatchContext = createContext<DispatchValue | null>(null);

export function DispatchProvider({ children }: {children: React.ReactNode;}) {
  const { user } = useSession();
  const [state, setState] = useState<AppState>(EMPTY);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setState(EMPTY);
      setReady(true);
      return;
    }
    const next = await api.state();
    setState(next);
    setReady(true);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    refresh().catch(() => {
      if (!cancelled) {
        setState(EMPTY);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(id);
  }, [user, refresh]);

  const userById = useCallback(
    (id: string | null | undefined) => {
      if (!id) return undefined;
      return state.users.find((u) => u.id === id);
    },
    [state.users]
  );

  const userName = useCallback(
    (id: string | null | undefined) => {
      const match = userById(id);
      return match ? `${match.f_name} ${match.l_name}` : 'System';
    },
    [userById]
  );

  const centerById = useCallback(
    (id: string | null | undefined) => {
      if (!id) return undefined;
      return state.commandCenters.find((c) => c.id === id);
    },
    [state.commandCenters]
  );

  const centerName = useCallback(
    (id: string | null | undefined) => centerById(id)?.name ?? 'System-wide',
    [centerById]
  );

  const alertById = useCallback(
    (id: string) => state.alerts.find((a) => a.id === id),
    [state.alerts]
  );

  const acknowledge = useCallback(
    async (alertId: string, centerId: string) => {
      await api.acknowledge(alertId, centerId);
      await refresh();
    },
    [refresh]
  );

  const dispatchResponders = useCallback(
    async (
      alertId: string,
      centerId: string,
      responderIds: string[],
      _actorId: string,
      leadId: string | null
    ) => {
      if (responderIds.length === 0) return;
      await api.dispatchResponders(alertId, centerId, responderIds, leadId);
      await refresh();
    },
    [refresh]
  );

  const reassignResponder = useCallback(
    async (declinedAssignmentId: string, newResponderId: string) => {
      await api.reassignResponder(declinedAssignmentId, newResponderId);
      await refresh();
    },
    [refresh]
  );

  const resolveBranch = useCallback(
    async (alertId: string, centerId: string) => {
      await api.resolveBranch(alertId, centerId);
      await refresh();
    },
    [refresh]
  );

  const reviewOutcome = useCallback(
    async (
      reviewId: string,
      decision: Exclude<ReviewStatus, 'pending'>,
      _actorId: string,
      notes: string
    ) => {
      await api.reviewOutcome(reviewId, decision, notes);
      await refresh();
    },
    [refresh]
  );

  const acknowledgeCivilianReport = useCallback(
    async (reportId: string) => {
      await api.acknowledgeCivilianReport(reportId);
      await refresh();
    },
    [refresh]
  );

  const createUser = useCallback(
    async (input: Omit<UserAccount, 'id'>) => {
      const result = await api.createUser(input);
      await refresh();
      return result;
    },
    [refresh]
  );

  const updateUser = useCallback(
    async (id: string, patch: Partial<UserAccount>) => {
      await api.updateUser(id, patch);
      await refresh();
    },
    [refresh]
  );

  const updateReport = useCallback(
    async (reportId: string, patch: Partial<IncidentReport>) => {
      const result = await api.updateReport(reportId, patch);
      await refresh();
      return (result as {report?: IncidentReport;}).report ?? null;
    },
    [refresh]
  );

  const createCenter = useCallback(
    async (input: Omit<CommandCenter, 'id' | 'created_at'>) => {
      const result = await api.createCenter(input);
      await refresh();
      return result.center;
    },
    [refresh]
  );

  const updateCenter = useCallback(
    async (id: string, patch: Partial<CommandCenter>) => {
      await api.updateCenter(id, patch);
      await refresh();
    },
    [refresh]
  );

  const deleteCenter = useCallback(
    async (id: string) => {
      await api.deleteCenter(id);
      await refresh();
    },
    [refresh]
  );

  const value = useMemo<DispatchValue>(
    () => ({
      ...state,
      ready,
      userList: state.users,
      userById,
      userName,
      centerById,
      centerName,
      alertById,
      refresh,
      acknowledge,
      dispatchResponders,
      reassignResponder,
      resolveBranch,
      reviewOutcome,
      acknowledgeCivilianReport,
      createUser,
      updateUser,
      updateReport,
      createCenter,
      updateCenter,
      deleteCenter
    }),
    [
      state,
      ready,
      userById,
      userName,
      centerById,
      centerName,
      alertById,
      refresh,
      acknowledge,
      dispatchResponders,
      reassignResponder,
      resolveBranch,
      reviewOutcome,
      acknowledgeCivilianReport,
      createUser,
      updateUser,
      updateReport,
      createCenter,
      updateCenter,
      deleteCenter
    ]
  );

  return <DispatchContext.Provider value={value}>{children}</DispatchContext.Provider>;
}

export function useDispatchData(): DispatchValue {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error('useDispatchData must be used inside DispatchProvider');
  return ctx;
}

export type { AppState, AlertOutcomeReview };
