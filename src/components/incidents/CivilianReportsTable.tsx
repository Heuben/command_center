import React, { useState } from 'react';
import { MapPinIcon } from 'lucide-react';
import type { CivilianReport } from '../../types';
import { useSession } from '../../contexts/SessionContext';
import { useDispatchData } from '../../contexts/DispatchContext';
import { centerName } from '../../data/commandCenters';
import { userName } from '../../data/users';
import { formatDateTime } from '../../utils/time';
import { DataTable } from '../ui/DataTable';
import type { Column } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { Button, EmptyState } from '../ui/primitives';
import { Drawer } from '../ui/Modal';

export function CivilianReportsTable({
  rows,
  showBranch



}: {rows: CivilianReport[];showBranch: boolean;}) {
  const [active, setActive] = useState<CivilianReport | null>(null);

  const columns: Column<CivilianReport>[] = [
  {
    key: 'report',
    header: 'Report',
    sortable: true,
    width: '96px',
    sortValue: (r) => r.id,
    render: (r) =>
    <span className="font-mono text-[12px] text-ink">#{r.id.replace('cr-', '')}</span>

  },
  {
    key: 'media',
    header: 'Media',
    width: '92px',
    render: (r) =>
    <img
      src={r.media_url}
      alt={`Media for civilian report ${r.id.toUpperCase()}`}
      className="h-11 w-16 rounded border border-line object-cover" />


  },
  {
    key: 'civilian',
    header: 'Civilian Name',
    sortable: true,
    sortValue: (r) => r.civilian_name,
    render: (r) =>
    <div className="leading-tight">
          <p className="truncate font-medium text-ink">{r.civilian_name}</p>
          <p className="truncate text-[12px] tabular-nums text-ink-muted">
            {formatDateTime(r.submitted_at)}
          </p>
        </div>

  },
  {
    key: 'location',
    header: 'Location',
    sortable: true,
    sortValue: (r) => r.human_location,
    render: (r) =>
    <div className="max-w-xs leading-tight">
          <p className="truncate text-[13px] text-ink">{r.human_location}</p>
          <p className="truncate text-[11px] tabular-nums text-ink-faint">
            {r.raw_location.lat.toFixed(4)}, {r.raw_location.lng.toFixed(4)}
          </p>
        </div>

  },
  ...(showBranch ?
  [
  {
    key: 'branch',
    header: 'Branch',
    sortable: true,
    sortValue: (r: CivilianReport) => centerName(r.command_center_id),
    render: (r: CivilianReport) =>
    <span className="text-[13px] text-ink-muted">{centerName(r.command_center_id)}</span>

  }] :

  []),
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    sortValue: (r) => r.status,
    render: (r) =>
    <Badge
      tone={r.status === 'pending' ? 'urgent' : 'success'}
      variant={r.status === 'pending' ? 'solid' : 'soft'}>
          {r.status === 'pending' ? 'Pending' : 'Acknowledged'}
        </Badge>

  }];


  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => setActive(r)}
        defaultSort={{ key: 'civilian', dir: 'desc' }}
        rowClassName={(r) => r.status === 'pending' ? 'bg-urgent-soft/40' : ''}
        empty={
        <EmptyState
          title="No civilian reports"
          description="Reports submitted by civilians will appear here." />

        } />
      

      <CivilianReportDrawer report={active} onClose={() => setActive(null)} />
    </>);

}

function CivilianReportDrawer({
  report,
  onClose



}: {report: CivilianReport | null;onClose: () => void;}) {
  const { user } = useSession();
  const { acknowledgeCivilianReport } = useDispatchData();

  if (!report) return null;
  const isPending = report.status === 'pending';

  return (
    <Drawer
      open={!!report}
      onClose={onClose}
      title={`Civilian Report ${report.id.toUpperCase()}`}
      subtitle={`${report.human_location} · ${centerName(report.command_center_id)}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={isPending ? 'urgent' : 'success'} variant={isPending ? 'solid' : 'soft'}>
            {isPending ? 'Pending' : 'Acknowledged'}
          </Badge>
          <span className="text-[13px] text-ink-muted">
            Submitted by: <span className="font-medium text-ink">{report.civilian_name}</span>
          </span>
          <span className="text-[13px] tabular-nums text-ink-muted">
            {formatDateTime(report.submitted_at)}
          </span>
        </div>

        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-faint">Attached Media</p>
          <img
            src={report.media_url}
            alt={`Media submitted with report ${report.id.toUpperCase()}`}
            className="w-full rounded-lg border border-line object-cover" />
          
          <p className="mt-2 flex items-center gap-1.5 text-[12px] tabular-nums text-ink-muted">
            <MapPinIcon className="h-3.5 w-3.5" />
            {report.raw_location.lat.toFixed(4)}, {report.raw_location.lng.toFixed(4)}
          </p>
        </div>

        {report.statement &&
        <div>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-faint">
              Civilian Statement
            </p>
            <div className="rounded-md border border-line bg-canvas p-4 text-[13px] italic text-ink">
              “{report.statement}”
            </div>
          </div>
        }

        {!isPending && report.acknowledged_by && report.acknowledged_at &&
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-[13px] text-success">
            Acknowledged by {userName(report.acknowledged_by)} on{' '}
            {formatDateTime(report.acknowledged_at)}.
          </div>
        }

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button onClick={onClose}>Close</Button>
          {isPending && user &&
          <Button
            variant="primary"
            onClick={() => {
              acknowledgeCivilianReport(report.id, user.id);
              onClose();
            }}>
              Acknowledge Report
            </Button>
          }
        </div>
      </div>
    </Drawer>);

}