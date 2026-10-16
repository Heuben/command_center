import React, {createContext,
  useCallback,
  useContext,
  useMemo,
  useState} from 'react';
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
  const [state] = useState<AppState>(EMPTY);
  const ready = true;

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
    },
    []
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
    },
    []
  );

  const reassignResponder = useCallback(
    async (declinedAssignmentId: string, newResponderId: string) => {
      await api.reassignResponder(declinedAssignmentId, newResponderId);
    },
    []
  );

  const resolveBranch = useCallback(
    async (alertId: string, centerId: string) => {
      await api.resolveBranch(alertId, centerId);
    },
    []
  );

  const reviewOutcome = useCallback(
    async (
      reviewId: string,
      decision: Exclude<ReviewStatus, 'pending'>,
      _actorId: string,
      notes: string
    ) => {
      await api.reviewOutcome(reviewId, decision, notes);
    },
    []
  );

  const acknowledgeCivilianReport = useCallback(
    async (reportId: string) => {
      await api.acknowledgeCivilianReport(reportId);
    },
    []
  );

  const createUser = useCallback(
    async (input: Omit<UserAccount, 'id'>) => {
      const result = await api.createUser(input);
      return result;
    },
    []
  );

  const updateUser = useCallback(
    async (id: string, patch: Partial<UserAccount>) => {
      await api.updateUser(id, patch);
    },
    []
  );

  const updateReport = useCallback(
    async (reportId: string, patch: Partial<IncidentReport>) => {
      const result = await api.updateReport(reportId, patch);
      return (result as {report?: IncidentReport;}).report ?? null;
    },
    []
  );

  const createCenter = useCallback(
    async (input: Omit<CommandCenter, 'id' | 'created_at'>) => {
      const result = await api.createCenter(input);
      return result.center;
    },
    []
  );

  const updateCenter = useCallback(
    async (id: string, patch: Partial<CommandCenter>) => {
      await api.updateCenter(id, patch);
    },
    []
  );

  const deleteCenter = useCallback(
    async (id: string) => {
      await api.deleteCenter(id);
    },
    []
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
