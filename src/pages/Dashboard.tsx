import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ClipboardCheckIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  RadioIcon } from
'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { useDispatchData } from '../contexts/DispatchContext';
import { alerts } from '../data/alerts';
import { users } from '../data/users';
import { commandCenters } from '../data/commandCenters';
import { EmergencyQueue, type QueueRow } from '../components/dispatch/EmergencyQueue';
import { DispatchPanel } from '../components/dispatch/DispatchPanel';
import { LiveMap } from '../components/dispatch/LiveMap';
import { EmptyState } from '../components/ui/primitives';
import { DUR, EASE } from '../lib/motion';

export function Dashboard() {
  const { scopeCenterId, isSuperadmin, now } = useSession();
  const { branchResponses } = useDispatchData();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(true);

  const rows = useMemo<QueueRow[]>(() => {
    return branchResponses.
    filter((r) => !scopeCenterId || r.command_center_id === scopeCenterId).
    map((response) => ({
      response,
      alert: alerts.find((a) => a.id === response.alert_id)!
    })).
    filter((r) => !!r.alert).
    sort(
      (a, b) =>
      new Date(b.response.triggered_at).getTime() -
      new Date(a.response.triggered_at).getTime()
    );
  }, [branchResponses, scopeCenterId]);

  /** Default to the most recent incident with responders in the field, else the newest alert. */
  const defaultRow =
  rows.find((r) => r.response.status === 'dispatched' || r.response.status === 'arrived') ??
  rows[0];
  const activeKey =
  selectedKey ?? (
  defaultRow ? `${defaultRow.alert.id}:${defaultRow.response.command_center_id}` : null);
  const selected = rows.find((r) => `${r.alert.id}:${r.response.command_center_id}` === activeKey);

  const scopedResponders = users.filter(
    (u) =>
    u.role === 'responder' &&
    u.account_status !== 'deactivated' && (
    !scopeCenterId || u.command_center_id === scopeCenterId)
  );
  const scopedCenters = commandCenters.filter((c) => !scopeCenterId || c.id === scopeCenterId);
  const onDuty = scopedResponders.filter((r) => r.r_profile?.availability !== 'off_duty').length;
  const pendingCount = rows.filter((r) => r.response.status === 'pending').length;

  const mapIncidents = rows.
  filter((r) => r.response.status !== 'resolved').
  map((r) => ({ alert: r.alert, status: r.response.status }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1">
        {/* Queue — collapsible so the map can take the full board */}
        {queueOpen ?
        <section
          aria-label="Emergency queue"
          className="flex w-[336px] shrink-0 flex-col border-r border-line bg-surface">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">Emergency Queue</h2>
                <p className="text-[12px] text-ink-muted">
                  {pendingCount > 0 ?
                `${pendingCount} awaiting acknowledgement` :
                'All alerts acknowledged'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-2 py-1 text-[11px] font-semibold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-ops-pulse" />
                  LIVE
                </span>
                <button
                onClick={() => setQueueOpen(false)}
                aria-label="Hide emergency queue"
                title="Hide queue"
                className="rounded-md p-1.5 text-ink-muted transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-ink">
                  <PanelLeftCloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
              <EmergencyQueue
              rows={rows}
              selectedKey={activeKey}
              onSelect={(row) =>
              setSelectedKey(`${row.alert.id}:${row.response.command_center_id}`)
              }
              now={now}
              showBranch={isSuperadmin && !scopeCenterId} />
            
            </div>
          </section> :

        <div className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-line bg-surface py-3">
            <button
            onClick={() => setQueueOpen(true)}
            aria-label="Show emergency queue"
            title="Show queue"
            className="rounded-md p-1.5 text-ink-muted transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-ink">
              <PanelLeftOpenIcon className="h-4 w-4" />
            </button>
            {pendingCount > 0 &&
          <span className="rounded-full bg-urgent px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                {pendingCount}
              </span>
          }
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint [writing-mode:vertical-rl]">
              Emergency Queue
            </span>
          </div>
        }

        {/* Map */}
        <section aria-label="Live incident map" className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-2.5">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2 text-[13px] text-ink-muted">
                <RadioIcon className="h-4 w-4 text-primary" />
                <span className="font-medium text-ink tabular-nums">{onDuty}</span> responders
                available
              </span>
              <span className="hidden h-4 w-px bg-line md:block" aria-hidden />
              <span className="hidden text-[13px] text-ink-muted md:inline">
                <span className="font-medium text-ink tabular-nums">{mapIncidents.length}</span>{' '}
                open incidents
              </span>
            </div>
            <Link
              to="/incidents"
              className="inline-flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.04]">
              <ClipboardCheckIcon className="h-4 w-4 text-ink-muted" />
              Incident Records
            </Link>
          </div>
          <div className="min-h-0 flex-1">
            <LiveMap
              incidents={mapIncidents}
              responders={scopedResponders}
              centers={scopedCenters}
              selectedAlertId={selected?.alert.id ?? null}
              onSelect={(alertId) => {
                const match = rows.find((r) => r.alert.id === alertId);
                if (match) setSelectedKey(`${match.alert.id}:${match.response.command_center_id}`);
              }} />
            
          </div>
        </section>

        {/* Dispatch panel */}
        <section
          aria-label="Dispatch panel"
          className="flex w-96 shrink-0 flex-col border-l border-line bg-canvas">
          {selected ?
          <motion.div
            key={`${selected.alert.id}:${selected.response.command_center_id}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0, transition: { duration: DUR.base, ease: EASE.out } }}
            className="flex min-h-0 flex-1">
              <DispatchPanel alert={selected.alert} response={selected.response} />
            </motion.div> :

          <EmptyState
            title="No incident selected"
            description="Select an alert from the emergency queue to view driver details, evidence, and responder assignments." />

          }
        </section>
      </div>
    </div>);

}