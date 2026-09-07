import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type {
  AlertBranchResponse,
  AlertOutcomeReview,
  AlertResponderAssignment,
  CivilianReport,
  IncidentReport,
  ReviewStatus,
  SystemAuditLog,
  UserAccount } from
'../types';
import {
  branchResponses as seedResponses,
  responderAssignments as seedAssignments } from
'../data/alerts';
import {
  civilianReports as seedCivilianReports,
  incidentReports as seedReports,
  outcomeReviews as seedReviews } from
'../data/incidents';
import { auditLogs as seedLogs } from '../data/auditLogs';
import { users as seedUsers } from '../data/users';

type DispatchValue = {
  branchResponses: AlertBranchResponse[];
  assignments: AlertResponderAssignment[];
  reviews: AlertOutcomeReview[];
  reports: IncidentReport[];
  civilianReports: CivilianReport[];
  logs: SystemAuditLog[];
  /** Mutable user list; Add Responder pushes new accounts here so the UI updates immediately. */
  userList: UserAccount[];
  acknowledge: (alertId: string, centerId: string, actorId: string) => void;
  dispatchResponders: (
  alertId: string,
  centerId: string,
  responderIds: string[],
  actorId: string,
  leadId: string | null)
  => void;
  reassignResponder: (
  declinedAssignmentId: string,
  newResponderId: string,
  actorId: string)
  => void;
  resolveBranch: (alertId: string, centerId: string, actorId: string) => void;
  reviewOutcome: (
  reviewId: string,
  decision: Exclude<ReviewStatus, 'pending'>,
  actorId: string,
  notes: string)
  => void;
  acknowledgeCivilianReport: (reportId: string, actorId: string) => void;
  createUser: (user: Omit<UserAccount, 'id'>, actorId: string) => UserAccount;
  updateUser: (id: string, patch: Partial<UserAccount>, actorId: string) => void;
  updateReport: (
  reportId: string,
  patch: Partial<IncidentReport>,
  actorId: string)
  => IncidentReport | null;
};

const DispatchContext = createContext<DispatchValue | null>(null);

let seq = 100;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

export function DispatchProvider({ children }: {children: React.ReactNode;}) {
  const [branchResponses, setBranchResponses] = useState(seedResponses);
  const [assignments, setAssignments] = useState(seedAssignments);
  const [reviews, setReviews] = useState(seedReviews);
  const [reports, setReports] = useState(seedReports);
  const [civilianReports, setCivilianReports] = useState(seedCivilianReports);
  const [logs, setLogs] = useState(seedLogs);
  /** Mutable user list — Add Responder pushes new accounts here. */
  const [userList, setUserList] = useState<UserAccount[]>(seedUsers);

  const log = useCallback((entry: Omit<SystemAuditLog, 'id' | 'created_at'>) => {
    setLogs((prev) => [
    { ...entry, id: nextId('log'), created_at: new Date().toISOString() },
    ...prev]
    );
  }, []);

  const acknowledge = useCallback(
    (alertId: string, centerId: string, actorId: string) => {
      setBranchResponses((prev) =>
      prev.map((r) =>
      r.alert_id === alertId && r.command_center_id === centerId && r.status === 'pending' ?
      { ...r, status: 'viewing', acknowledged_at: new Date().toISOString() } :
      r
      )
      );
      log({
        actor_id: actorId,
        command_center_id: centerId,
        action: 'ACKNOWLEDGE_ALERT',
        target_entity: 'alert_branch_response',
        target_id: alertId,
        reference: `#${alertId.replace('a-', '')}`,
        old_value: { status: 'pending' },
        new_value: { status: 'viewing' }
      });
    },
    [log]
  );

  /** Batch dispatch: one assignment row per responder, one audit entry per row. */
  const dispatchResponders = useCallback(
    (
    alertId: string,
    centerId: string,
    responderIds: string[],
    actorId: string,
    leadId: string | null) =>
    {
      if (responderIds.length === 0) return;
      const assignedAt = new Date().toISOString();
      const created = responderIds.map((responderId) => ({
        id: nextId('ara'),
        alert_id: alertId,
        command_center_id: centerId,
        responder_id: responderId,
        status: 'assigned' as const,
        dispatch_origin: 'admin_dispatched' as const,
        assigned_by: actorId,
        assigned_at: assignedAt,
        confirmed_at: null,
        arrived_at: null,
        is_lead: responderId === leadId
      }));

      setAssignments((prev) => [...prev, ...created]);
      setBranchResponses((prev) =>
      prev.map((r) =>
      r.alert_id === alertId &&
      r.command_center_id === centerId && (
      r.status === 'pending' || r.status === 'viewing') ?
      { ...r, status: 'dispatched', dispatched_at: assignedAt } :
      r
      )
      );
      created.forEach((assignment) => {
        log({
          actor_id: actorId,
          command_center_id: centerId,
          action: 'DISPATCH_RESPONDER',
          target_entity: 'alert_responder_assignment',
          target_id: assignment.id,
          reference: `#${assignment.id.toUpperCase()}`,
          old_value: null,
          new_value: {
            alert_id: alertId,
            responder_id: assignment.responder_id,
            status: 'assigned',
            dispatch_origin: 'admin_dispatched',
            is_lead: assignment.is_lead
          }
        });
      });
    },
    [log]
  );

  /** Swap out a responder who declined the dispatch order, keeping the declined row for the record. */
  const reassignResponder = useCallback(
    (declinedAssignmentId: string, newResponderId: string, actorId: string) => {
      const assignedAt = new Date().toISOString();
      const id = nextId('ara');
      setAssignments((prev) => {
        const declined = prev.find((a) => a.id === declinedAssignmentId);
        if (!declined) return prev;
        return [
        ...prev.map((a) =>
        a.id === declinedAssignmentId ? { ...a, replaced_by: newResponderId } : a
        ),
        {
          id,
          alert_id: declined.alert_id,
          command_center_id: declined.command_center_id,
          responder_id: newResponderId,
          status: 'assigned' as const,
          dispatch_origin: 'admin_dispatched' as const,
          assigned_by: actorId,
          assigned_at: assignedAt,
          confirmed_at: null,
          arrived_at: null,
          is_lead: declined.is_lead
        }];

      });
      const source = assignments.find((a) => a.id === declinedAssignmentId);
      log({
        actor_id: actorId,
        command_center_id: source?.command_center_id ?? null,
        action: 'DISPATCH_RESPONDER',
        target_entity: 'alert_responder_assignment',
        target_id: id,
        reference: `#${id.toUpperCase()}`,
        old_value: {
          replaced_assignment: declinedAssignmentId,
          declined_by: source?.responder_id ?? null,
          decline_reason: source?.decline_reason ?? null
        },
        new_value: {
          alert_id: source?.alert_id,
          responder_id: newResponderId,
          status: 'assigned',
          dispatch_origin: 'admin_dispatched'
        }
      });
    },
    [log, assignments]
  );

  const resolveBranch = useCallback(
    (alertId: string, centerId: string, actorId: string) => {
      const at = new Date().toISOString();
      setBranchResponses((prev) =>
      prev.map((r) =>
      r.alert_id === alertId && r.command_center_id === centerId ?
      { ...r, status: 'resolved', resolved_at: at } :
      r
      )
      );
      log({
        actor_id: actorId,
        command_center_id: centerId,
        action: 'RESOLVE_ALERT',
        target_entity: 'alert_branch_response',
        target_id: alertId,
        reference: `#${alertId.replace('a-', '')}`,
        old_value: { status: 'arrived', resolved_at: null },
        new_value: { status: 'resolved', resolved_at: at }
      });
    },
    [log]
  );

  const reviewOutcome = useCallback(
    (
    reviewId: string,
    decision: Exclude<ReviewStatus, 'pending'>,
    actorId: string,
    notes: string) =>
    {
      const at = new Date().toISOString();
      let centerId: string | null = null;
      setReviews((prev) =>
      prev.map((r) => {
        if (r.id !== reviewId) return r;
        centerId = r.command_center_id;
        return {
          ...r,
          review_status: decision,
          reviewed_by: actorId,
          reviewed_at: at,
          reviewer_notes: notes || null
        };
      })
      );
      const target = reviews.find((r) => r.id === reviewId);
      if (decision === 'approved' && target) {
        setBranchResponses((prev) =>
        prev.map((r) =>
        r.alert_id === target.alert_id && r.command_center_id === target.command_center_id ?
        { ...r, status: 'resolved', resolved_at: at } :
        r
        )
        );
      }
      log({
        actor_id: actorId,
        command_center_id: centerId,
        action: 'REVIEW_ALERT_OUTCOME',
        target_entity: 'alert_outcome_review',
        target_id: reviewId,
        reference: `#${reviewId.toUpperCase()}`,
        old_value: { review_status: 'pending', reviewed_by: null },
        new_value: { review_status: decision, reviewed_by: actorId }
      });
    },
    [log, reviews]
  );

  const acknowledgeCivilianReport = useCallback((reportId: string, actorId: string) => {
    const at = new Date().toISOString();
    setCivilianReports((prev) =>
    prev.map((r) =>
    r.id === reportId ?
    { ...r, status: 'acknowledged', acknowledged_by: actorId, acknowledged_at: at } :
    r
    )
    );
  }, []);

  /** Create a new user account and audit-log the action. */
  const createUser = useCallback(
    (input: Omit<UserAccount, 'id'>, actorId: string): UserAccount => {
      const id = `u-${Date.now().toString(36)}`;
      const next: UserAccount = { ...input, id };
      setUserList((prev) => [...prev, next]);
      log({
        actor_id: actorId,
        command_center_id: input.command_center_id,
        action: 'CREATE_USER',
        target_entity: 'user_account',
        target_id: id,
        reference: `#U-${id.toUpperCase().replace('U-', '')}`,
        old_value: null,
        new_value: {
          f_name: input.f_name,
          l_name: input.l_name,
          role: input.role,
          email: input.email,
          command_center_id: input.command_center_id,
          must_change_password: input.must_change_password ?? true
        }
      });
      return next;
    },
    [log]
  );

  /** Update an existing user (used by Settings profile save, role change, etc.). */
  const updateUser = useCallback(
    (id: string, patch: Partial<UserAccount>, actorId: string) => {
      let prev: UserAccount | undefined;
      setUserList((curr) =>
      curr.map((u) => {
        if (u.id !== id) return u;
        prev = u;
        return { ...u, ...patch };
      })
      );
      if (prev) {
        log({
          actor_id: actorId,
          command_center_id: patch.command_center_id ?? prev.command_center_id ?? null,
          action: 'UPDATE_USER',
          target_entity: 'user_account',
          target_id: id,
          reference: `#U-${id.toUpperCase().replace('U-', '')}`,
          old_value: { f_name: prev.f_name, l_name: prev.l_name, email: prev.email },
          new_value: patch as Record<string, unknown>
        });
      }
    },
    [log]
  );

  /**
   * Patch a post-incident report and audit-log the change. The drawer uses this
   * for "Save Draft" (status: draft) and "Approve Report" (status: approved).
   */
  const updateReport = useCallback(
    (
    reportId: string,
    patch: Partial<IncidentReport>,
    actorId: string)
    : IncidentReport | null => {
      let next: IncidentReport | null = null;
      setReports((prev) =>
      prev.map((r) => {
        if (r.id !== reportId) return r;
        const merged: IncidentReport = {
          ...r,
          ...patch,
          ...(patch.status === 'approved' && r.status !== 'approved' ?
          { submitted_by_id: actorId, submitted_at: new Date().toISOString() } :
          {})
        };
        next = merged;
        return merged;
      })
      );
      if (next) {
        log({
          actor_id: actorId,
          command_center_id: (next as IncidentReport).command_center_id,
          action: 'SUBMIT_INCIDENT_REPORT',
          target_entity: 'incident_report',
          target_id: reportId,
          reference: `#${reportId.toUpperCase()}`,
          old_value: { status: reports.find((r) => r.id === reportId)?.status ?? null },
          new_value: {
            status: patch.status ?? null,
            summary_changed: patch.summary !== undefined,
            narrative_changed: patch.detailed_narrative !== undefined
          }
        });
      }
      return next;
    },
    [log, reports]
  );

  const value = useMemo<DispatchValue>(
    () => ({
      branchResponses,
      assignments,
      reviews,
      reports,
      civilianReports,
      logs,
      userList,
      acknowledge,
      dispatchResponders,
      reassignResponder,
      resolveBranch,
      reviewOutcome,
      acknowledgeCivilianReport,
      createUser,
      updateUser,
      updateReport
    }),
    [
    branchResponses,
    assignments,
    reviews,
    reports,
    civilianReports,
    logs,
    userList,
    acknowledge,
    dispatchResponders,
    reassignResponder,
    resolveBranch,
    reviewOutcome,
    acknowledgeCivilianReport,
    createUser,
    updateUser,
    updateReport]

  );

  return <DispatchContext.Provider value={value}>{children}</DispatchContext.Provider>;
}

export function useDispatchData(): DispatchValue {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error('useDispatchData must be used inside DispatchProvider');
  return ctx;
}