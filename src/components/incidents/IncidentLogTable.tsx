import React, { useState } from 'react';
import type { Alert, AlertBranchResponse } from '../../types';
import { centerName } from '../../data/commandCenters';
import { alertById } from '../../data/alerts';
import { alertTypeLabel, confidenceDisplay } from '../../utils/labels';
import { durationBetween, formatDateTime } from '../../utils/time';
import { DataTable } from '../ui/DataTable';
import type { Column } from '../ui/DataTable';
import { Badge, BranchStatusBadge, OutcomeBadge } from '../ui/Badge';
import { Button, EmptyState } from '../ui/primitives';
import { Drawer } from '../ui/Modal';

export type IncidentLogRow = {
  alert: Alert;
  response: AlertBranchResponse;
};

export function IncidentLogTable({
  rows,
  showBranch



}: {rows: IncidentLogRow[];showBranch: boolean;}) {
  const [active, setActive] = useState<IncidentLogRow | null>(null);

  const columns: Column<IncidentLogRow>[] = [
  {
    key: 'ref',
    header: 'Alert',
    sortable: true,
    width: '96px',
    sortValue: (r) => r.alert.id,
    render: (r) =>
    <span className="font-mono text-[12px] text-ink">#{r.alert.id.replace('a-', '')}</span>

  },
  {
    key: 'datetime',
    header: 'Date / Time',
    sortable: true,
    sortValue: (r) => r.response.triggered_at,
    render: (r) =>
    <span className="text-[13px] tabular-nums text-ink-muted">
          {formatDateTime(r.response.triggered_at)}
        </span>

  },
  {
    key: 'type',
    header: 'Classification',
    sortable: true,
    sortValue: (r) => alertTypeLabel[r.alert.alert_type],
    render: (r) =>
    <div>
          <p className="font-medium text-ink">{alertTypeLabel[r.alert.alert_type]}</p>
          <p className="truncate text-[12px] text-ink-muted">{r.alert.address}</p>
        </div>

  },
  {
    key: 'response_time',
    header: 'Response Time',
    sortable: true,
    align: 'right',
    sortValue: (r) =>
    r.response.arrived_at ?
    new Date(r.response.arrived_at).getTime() -
    new Date(r.response.triggered_at).getTime() :
    Number.MAX_SAFE_INTEGER,
    render: (r) => durationBetween(r.response.triggered_at, r.response.arrived_at)
  },
  {
    key: 'branch_status',
    header: 'Branch Response',
    sortable: true,
    sortValue: (r) => r.response.status,
    render: (r) => <BranchStatusBadge status={r.response.status} />
  },
  ...(showBranch ?
  [
  {
    key: 'branch',
    header: 'Branch',
    sortable: true,
    sortValue: (r: IncidentLogRow) => centerName(r.response.command_center_id),
    render: (r: IncidentLogRow) =>
    <span className="text-[13px] text-ink-muted">
                {centerName(r.response.command_center_id)}
              </span>

  }] :

  []),
  {
    key: 'outcome',
    header: 'Final Outcome',
    sortable: true,
    sortValue: (r) => r.alert.outcome,
    render: (r) => <OutcomeBadge outcome={r.alert.outcome} />
  }];


  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => `${r.alert.id}:${r.response.command_center_id}`}
        onRowClick={(r) => setActive(r)}
        defaultSort={{ key: 'datetime', dir: 'desc' }}
        empty={
        <EmptyState
          title="No incidents in this range"
          description="Alerts broadcast to this branch will appear here once triggered." />

        } />
      

      <IncidentLogDrawer row={active} onClose={() => setActive(null)} />
    </>);

}

function IncidentLogDrawer({ row, onClose }: {row: IncidentLogRow | null;onClose: () => void;}) {
  if (!row) return null;

  const alert = alertById(row.alert.id) ?? row.alert;
  const responseTime = row.response.arrived_at ?
  durationBetween(row.response.triggered_at, row.response.arrived_at) :
  '—';

  return (
    <Drawer
      open={!!row}
      onClose={onClose}
      title={`Alert #${row.alert.id.replace('a-', '')}`}
      subtitle={`${alertTypeLabel[alert.alert_type]} · ${alert.address}`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="primary">{alertTypeLabel[alert.alert_type]}</Badge>
          <BranchStatusBadge status={row.response.status} />
          <OutcomeBadge outcome={alert.outcome} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-faint">Snapshot</p>
            {alert.snapshot_urls[0] ?
            <img
              src={alert.snapshot_urls[0]}
              alt={`Alert ${row.alert.id}`}
              className="w-full rounded-lg border border-line object-cover" /> :


            <div className="rounded-lg border border-line bg-canvas p-4 text-[13px] text-ink-muted">
                No snapshot available.
              </div>
            }
          </div>

          <div className="space-y-4">
            <DetailRow label="Location">{alert.address}</DetailRow>
            <DetailRow label="Branch">{centerName(row.response.command_center_id)}</DetailRow>
            <DetailRow label="Confidence">{confidenceDisplay(alert.confidence_level)}</DetailRow>
            <DetailRow label="Triggered">{formatDateTime(row.response.triggered_at)}</DetailRow>
            <DetailRow label="Acknowledged">
              {row.response.acknowledged_at ? formatDateTime(row.response.acknowledged_at) : '—'}
            </DetailRow>
            <DetailRow label="Dispatched">
              {row.response.dispatched_at ? formatDateTime(row.response.dispatched_at) : '—'}
            </DetailRow>
            <DetailRow label="Arrived">
              {row.response.arrived_at ? formatDateTime(row.response.arrived_at) : '—'}
            </DetailRow>
            <DetailRow label="Response Time">{responseTime}</DetailRow>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Drawer>);

}

function DetailRow({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div className="rounded-md border border-line bg-ink/[0.02] p-3">
      <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="text-[13px] text-ink">{children}</p>
    </div>);

}