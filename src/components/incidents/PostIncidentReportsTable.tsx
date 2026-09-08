import React, { useEffect, useState } from 'react';
import type { IncidentReport } from '../../types';
import { alertById } from '../../data/alerts';
import { userName } from '../../data/users';
import { centerName } from '../../data/commandCenters';
import { alertTypeLabel } from '../../utils/labels';
import { formatDateTime } from '../../utils/time';
import { DataTable } from '../ui/DataTable';
import type { Column } from '../ui/DataTable';
import { ReportStatusBadge } from '../ui/Badge';
import { Button, EmptyState, Input, Label, Textarea } from '../ui/primitives';
import { Drawer, Modal } from '../ui/Modal';
import { useSession } from '../../contexts/SessionContext';
import { useDispatchData } from '../../contexts/DispatchContext';

export function PostIncidentReportsTable({
  rows,
  showBranch



}: {rows: IncidentReport[];showBranch: boolean;}) {
  const { user } = useSession();
  const { updateReport } = useDispatchData();

  const [active, setActive] = useState<IncidentReport | null>(null);
  /** Live edits — kept separate from the seeded `rows` prop so changes are tracked in-memory. */
  const [summary, setSummary] = useState('');
  const [detailedNarrative, setDetailedNarrative] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');

  // Seed form fields from the selected report; reset on each open so prior edits don't bleed in.
  useEffect(() => {
    if (active) {
      setSummary(active.summary);
      setDetailedNarrative(active.detailed_narrative);
      setSaving(false);
      setNotice(null);
      setError(null);
      setRevisionOpen(false);
      setRevisionReason('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // Auto-dismiss banners.
  useEffect(() => {
    if (notice === null && error === null) return;
    const id = window.setTimeout(() => {
      setNotice(null);
      setError(null);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [notice, error]);

  const handleClose = () => {
    setActive(null);
    setSummary('');
    setDetailedNarrative('');
  };

  const handleRequestRevision = () => {
    if (!active) return;
    if (!revisionReason.trim()) {
      setError('Explain what needs to be revised before sending the request.');
      return;
    }
    setSaving(true);
    try {
      const updated = updateReport(
        active.id,
        {
          status: 'under_review',
          summary: summary.trim(),
          detailed_narrative: detailedNarrative.trim(),
          revision_request: {
            reason: revisionReason.trim(),
            requested_by: user?.id ?? '',
            requested_at: new Date().toISOString()
          }
        },
        user?.id ?? ''
      );
      if (updated) {
        setActive(updated);
        setNotice(
          `Revision requested. ${userName(updated.assigned_reporter_id)} was notified with your notes.`
        );
      }
      setRevisionOpen(false);
      setRevisionReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send the revision request.');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveReport = () => {
    if (!active) return;
    if (!summary.trim()) {
      setError('Summary cannot be empty before approval.');
      return;
    }
    setSaving(true);
    try {
      const updated = updateReport(
        active.id,
        {
          status: 'approved',
          summary: summary.trim(),
          detailed_narrative: detailedNarrative.trim()
        },
        user?.id ?? ''
      );
      if (updated) {
        setActive(updated);
        setNotice('Report approved and submitted.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve report.');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<IncidentReport>[] = [
  {
    key: 'report',
    header: 'Report',
    sortable: true,
    width: '100px',
    sortValue: (r) => r.id,
    render: (r) => <span className="font-mono text-[12px] text-ink">{r.id.toUpperCase()}</span>
  },
  {
    key: 'alert',
    header: 'Alert',
    sortable: true,
    width: '96px',
    sortValue: (r) => r.alert_id,
    render: (r) =>
    <span className="font-mono text-[12px] text-ink-muted">
          #{r.alert_id.replace('a-', '')}
        </span>

  },
  {
    key: 'summary',
    header: 'Summary',
    sortable: true,
    sortValue: (r) => r.summary,
    render: (r) =>
    <div className="max-w-md leading-tight">
          <p className="truncate font-medium text-ink">{r.summary}</p>
          <p className="truncate text-[12px] text-ink-muted">
            {alertById(r.alert_id) ? alertTypeLabel[alertById(r.alert_id)!.alert_type] : '—'}
          </p>
        </div>

  },
  {
    key: 'reporter',
    header: 'Assigned Reporter',
    sortable: true,
    sortValue: (r) => userName(r.assigned_reporter_id),
    render: (r) => userName(r.assigned_reporter_id)
  },
  {
    key: 'submitted_by',
    header: 'Submitted By',
    sortable: true,
    sortValue: (r) => r.submitted_by_id ? userName(r.submitted_by_id) : '',
    render: (r) =>
    r.submitted_by_id ?
    <div className="leading-tight">
            <p className="truncate text-ink">{userName(r.submitted_by_id)}</p>
            <p className="truncate text-[12px] tabular-nums text-ink-muted">
              {r.submitted_at ? formatDateTime(r.submitted_at) : ''}
            </p>
          </div> :

    <span className="text-ink-muted">Not yet submitted</span>

  },
  ...(showBranch ?
  [
  {
    key: 'branch' as const,
    header: 'Branch',
    sortable: true,
    sortValue: (r: IncidentReport) => centerName(r.command_center_id),
    render: (r: IncidentReport) =>
    <span className="text-[13px] text-ink-muted">{centerName(r.command_center_id)}</span>

  }] :

  []),
  {
    key: 'status',
    header: 'Report Status',
    sortable: true,
    sortValue: (r) => r.status,
    render: (r) => <ReportStatusBadge status={r.status} />
  }];


  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => setActive(r)}
        defaultSort={{ key: 'report', dir: 'desc' }}
        empty={
        <EmptyState
          title="No post-incident reports"
          description="Written reports filed after an incident appear here." />

        } />
      

      <Drawer
        open={!!active}
        onClose={handleClose}
        title={active ? `${active.id.toUpperCase()} · Post-Incident Report` : ''}
        subtitle={
        active ?
        `Alert #${active.alert_id.replace('a-', '')} · ${centerName(
          active.command_center_id
        )}` :
        ''
        }>
        {active &&
        <div className="space-y-5">
            {notice &&
          <div
            role="status"
            className="rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-[13px] text-success">
                {notice}
              </div>
          }
            {error &&
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger">
                {error}
              </div>
          }

            <div className="flex flex-wrap items-center gap-3">
              <ReportStatusBadge status={active.status} />
              <span className="text-[13px] text-ink-muted">
                Reporter: {userName(active.assigned_reporter_id)}
              </span>
              {active.submitted_at &&
            <span className="text-[13px] tabular-nums text-ink-muted">
                  Submitted {formatDateTime(active.submitted_at)}
                </span>
            }
            </div>

            <div>
              <Label htmlFor="report-summary">Summary</Label>
              <Input
              id="report-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)} />
            
            </div>

            <div>
              <Label htmlFor="report-narrative">Detailed Narrative</Label>
              <Textarea
              id="report-narrative"
              rows={9}
              value={detailedNarrative}
              onChange={(e) => setDetailedNarrative(e.target.value)}
              placeholder="Describe what the responder observed and did on scene." />
            
            </div>

            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink-faint">
                Attached Evidence
              </p>
              <div className="flex gap-2">
                {active.evidence_urls.map((url) =>
              <img
                key={url}
                src={url}
                alt={`Evidence attached to report ${active.id.toUpperCase()}`}
                className="h-24 w-36 rounded-md border border-line object-cover" />

              )}
              </div>
            </div>

            {active.revision_request &&
          <div className="rounded-md border border-urgent/30 bg-urgent-soft px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-urgent">
                  Revision Requested
                </p>
                <p className="mt-1 text-[13px] text-ink">{active.revision_request.reason}</p>
                <p className="mt-1 text-[12px] tabular-nums text-ink-muted">
                  {userName(active.revision_request.requested_by)} ·{' '}
                  {formatDateTime(active.revision_request.requested_at)}
                </p>
              </div>
          }

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button
              onClick={() => {
                setError(null);
                setRevisionOpen(true);
              }}
              disabled={saving || active.status === 'approved'}>
                Request Revision
              </Button>
              <Button
              variant="primary"
              onClick={handleApproveReport}
              disabled={saving || active.status === 'approved'}>
                {active.status === 'approved' ? 'Approved ✓' : 'Approve Report'}
              </Button>
            </div>
          </div>
        }
      </Drawer>

      <Modal
        open={revisionOpen}
        onClose={() => setRevisionOpen(false)}
        title="Request Revision"
        subtitle={
        active ?
        `${active.id.toUpperCase()} will be sent back to ${userName(
          active.assigned_reporter_id
        )} for rework.` :
        ''
        }
        footer={
        <>
            <Button onClick={() => setRevisionOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
            variant="primary"
            onClick={handleRequestRevision}
            disabled={saving || !revisionReason.trim()}>
              {saving ? 'Sending…' : 'Send Request'}
            </Button>
          </>
        }>
        <div>
          <Label htmlFor="revision-reason">What needs to be revised?</Label>
          <Textarea
            id="revision-reason"
            rows={5}
            value={revisionReason}
            onChange={(e) => setRevisionReason(e.target.value)}
            placeholder="e.g. The report submitted is lacking in detail and the wording is confusing." />
          
          <p className="mt-2 text-[12px] text-ink-muted">
            These notes are sent to the assigned reporter and recorded in the audit log.
          </p>
        </div>
      </Modal>
    </>);

}