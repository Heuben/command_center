import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DownloadIcon,
  FileText,
  RefreshCw,
  Shield,
  X,
  XCircle,
} from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { Button, Card, PageHeader, Segmented } from '../components/ui/primitives';
// 👇 adjust this one path if your api.ts lives elsewhere
import {
  api,
  ApiError,
  type IncidentOutcome,
  type IncidentReportEntity,
  type IncidentReportSummary,
  type IncidentTimelineEvent,
  type IncidentTimelineKind,
  type ReportStatus,
  type TriggerSource,
} from '../lib/api';
import { rowsToCsv, downloadCsv, type Column } from '../utils/csv';
import { formatDateTime } from '../utils/time';
import { DUR, EASE } from '../lib/motion';

// ============================================================================
// Types + constants
// ============================================================================

type Tab = 'awaiting' | 'revisions' | 'approved' | 'all';
type DialogKind = 'verify' | 'resolve' | 'approve' | 'reject';
interface DialogState {
  kind: DialogKind;
  report: IncidentReportEntity;
}

const LIMIT = 20;

const TRIGGER_OPTIONS: { value: TriggerSource; label: string }[] = [
  { value: 'EDGE_AI', label: 'Edge AI' },
  { value: 'MANUAL_SOS', label: 'Manual SOS' },
  { value: 'CRASH_IMU', label: 'Crash IMU' },
  { value: 'CENTER_MANUAL', label: 'Center Manual' },
];

function statusesForTab(tab: Tab): ReportStatus[] {
  if (tab === 'awaiting') return ['submitted', 'under_review'];
  if (tab === 'revisions') return ['needs_revision'];
  if (tab === 'approved') return ['approved'];
  // "all" — exclude drafts; they belong to the responder.
  return ['submitted', 'under_review', 'needs_revision', 'approved'];
}

/** Mirrors the backend `canResolve` condition, based on the report payload. */
function canResolveReport(r: IncidentReportEntity): boolean {
  if (r.is_incident_resolved || r.is_incident_cancelled) return false;
  if (
    !['ON_SCENE', 'AWAITING_VERIFICATION', 'ESCALATED'].includes(
      r.incident_status,
    )
  ) {
    return false;
  }
  if (r.incident_threat_category === 'ASSIST') return true;
  if (
    r.incident_threat_category === 'DE_ESCALATABLE' &&
    (r.incident_threat_level === 'DE_ESCALATED' ||
      r.incident_threat_level === 'CLEAR')
  ) {
    return true;
  }
  return r.incident_verified_at !== null;
}

function rowActionsFor(
  r: IncidentReportEntity,
): Array<{ kind: DialogKind; label: string; variant?: 'primary' | 'danger' }> {
  const actions: Array<{
    kind: DialogKind;
    label: string;
    variant?: 'primary' | 'danger';
  }> = [];
  if (r.needs_incident_verification) {
    actions.push({ kind: 'verify', label: 'Verify', variant: 'primary' });
  }
  if (canResolveReport(r)) {
    actions.push({ kind: 'resolve', label: 'Resolve', variant: 'primary' });
  }
  if (r.is_report_pending_review) {
    actions.push({ kind: 'approve', label: 'Approve' });
    actions.push({ kind: 'reject', label: 'Reject', variant: 'danger' });
  }
  return actions;
}

function humanizeKind(kind: IncidentTimelineKind): string {
  switch (kind) {
    case 'incident_created':
      return 'Incident created';
    case 'wave_issued':
      return 'Wave issued';
    case 'responder_offered':
      return 'Responder offered';
    case 'responder_claimed':
      return 'Responder claimed';
    case 'responder_en_route':
      return 'Responder en route';
    case 'responder_arrived':
      return 'Responder arrived on scene';
    case 'incident_escalated':
      return 'Incident escalated';
    case 'verification_completed':
      return 'Incident verified';
    case 'incident_resolved':
      return 'Incident resolved';
    case 'incident_cancelled':
      return 'Incident cancelled';
    case 'report_created':
      return 'Report created';
    case 'report_submitted':
      return 'Report submitted';
    case 'report_approved':
      return 'Report approved';
    case 'report_rejected':
      return 'Report sent back for revision';
  }
}

// ============================================================================
// Main component
// ============================================================================

export function IncidentHistory() {
  const { scopeCenterId, isSuperadmin } = useSession();

  // Filters
  const [tab, setTab] = useState<Tab>('awaiting');
  const [triggerSources, setTriggerSources] = useState<TriggerSource[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [offset, setOffset] = useState(0);

  // Data
  const [summary, setSummary] = useState<IncidentReportSummary | null>(null);
  const [reports, setReports] = useState<IncidentReportEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Drawer
  const [selected, setSelected] = useState<IncidentReportEntity | null>(null);
  const [timeline, setTimeline] = useState<IncidentTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Action dialog
  const [dialog, setDialog] = useState<DialogState | null>(null);

  // Super admins pass their scope; admins are auto-scoped by the backend JWT.
  const commandCenterId =
    isSuperadmin && scopeCenterId ? scopeCenterId : undefined;

  // Auto-clear success banner
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(null), 3000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  // Load summary + list whenever filters/offset change
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const commonFilters = {
        command_center_id: commandCenterId,
        trigger_sources: triggerSources.length ? triggerSources : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      };
      const [summaryRes, listRes] = await Promise.all([
        api.incidentReportsSummary({
          ...commonFilters,
          statuses: statusesForTab(tab),
        }),
        api.listIncidentReports({
          ...commonFilters,
          statuses: statusesForTab(tab),
          sort_by: 'submitted_at',
          sort_order: 'desc',
          limit: LIMIT,
          offset,
        }),
      ]);
      setSummary(summaryRes);
      setReports(listRes.items);
      setTotal(listRes.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [tab, triggerSources, fromDate, toDate, offset, commandCenterId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Reset offset when filters change (except offset itself)
  useEffect(() => {
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, triggerSources, fromDate, toDate]);

  // Open detail drawer + fetch timeline
  const openDetail = useCallback(async (report: IncidentReportEntity) => {
    setSelected(report);
    setTimeline([]);
    setTimelineLoading(true);
    try {
      const res = await api.getIncidentTimeline(report.incident_id);
      setTimeline(res.events);
    } catch (e) {
      // Non-fatal — the drawer is still usable without the timeline
      console.warn('Timeline fetch failed', e);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  const closeDetail = () => {
    setSelected(null);
    setTimeline([]);
  };

  const refreshAll = useCallback(async () => {
    await loadData();
    if (selected) {
      try {
        const updated = await api.getIncidentReport(selected.id);
        setSelected(updated);
        const t = await api.getIncidentTimeline(updated.incident_id);
        setTimeline(t.events);
      } catch {
        closeDetail();
      }
    }
  }, [loadData, selected]);

  // Execute one of the four actions
  const runAction = async (
    kind: DialogKind,
    notes: string,
    outcome?: IncidentOutcome,
  ) => {
    if (!dialog) return;
    const { report } = dialog;
    try {
      if (kind === 'verify') {
        await api.verifyIncident(report.incident_id, notes || null);
        setSuccessMsg('Incident verified.');
      } else if (kind === 'resolve') {
        await api.resolveIncident(report.incident_id, outcome ?? 'confirmed');
        setSuccessMsg('Incident resolved.');
      } else if (kind === 'approve') {
        await api.approveReport(report.id, notes || null);
        setSuccessMsg('Report approved.');
      } else {
        await api.requestReportRevision(report.id, notes);
        setSuccessMsg('Revision requested.');
      }
      setDialog(null);
      await refreshAll();
    } catch (e) {
      setDialog(null);
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
          ? e.message
          : 'Action failed.',
      );
    }
  };

  // CSV export of the currently visible page
  const exportCsv = () => {
    const cols: Array<Column<Record<string, string>>> = [
      { key: 'id', header: 'Report ID' },
      { key: 'incident_id', header: 'Incident ID' },
      { key: 'trigger', header: 'Trigger' },
      { key: 'incident_status', header: 'Incident Status' },
      { key: 'report_status', header: 'Report Status' },
      { key: 'disposition', header: 'Disposition' },
      { key: 'summary', header: 'Summary' },
      { key: 'claimed_by', header: 'Claimed By' },
      { key: 'submitted_at', header: 'Submitted At' },
      { key: 'reviewed_at', header: 'Reviewed At' },
    ];
    const records = reports.map((r) => ({
      id: r.id,
      incident_id: r.incident_id,
      trigger: r.incident_trigger_source,
      incident_status: r.incident_status,
      report_status: r.status,
      disposition: r.disposition ?? '',
      summary: r.summary,
      claimed_by: r.incident_claimed_by_name ?? '',
      submitted_at: r.submitted_at ? formatDateTime(r.submitted_at) : '',
      reviewed_at: r.reviewed_at ? formatDateTime(r.reviewed_at) : '',
    }));
    downloadCsv(
      `incident-reports-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCsv(records, cols),
    );
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const currentPage = Math.floor(offset / LIMIT) + 1;

  // ---- Render ----

  return (
    <>
      <PageHeader
        title={isSuperadmin ? 'Incident History & Reports' : 'Incidents & Reporting'}
        subtitle={
          scopeCenterId
            ? `Records for ${scopeCenterId.slice(0, 8)}…`
            : 'Records across all command centers'
        }
        actions={
          <Segmented<Tab>
            ariaLabel="Report category"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'awaiting', label: 'Awaiting Review' },
              { value: 'revisions', label: 'Needs Revision' },
              { value: 'approved', label: 'Approved' },
              { value: 'all', label: 'All' },
            ]}
          />
        }
      />

      <div className="space-y-4">
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-urgent/30 bg-urgent-soft px-4 py-3 text-sm text-urgent">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </span>
            <button
              className="text-xs font-semibold underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: DUR.base, ease: EASE.out }}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            >
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <SummaryPills summary={summary} loading={loading} />

        <FilterBar
          triggerSources={triggerSources}
          onToggleTrigger={(t) =>
            setTriggerSources((prev) =>
              prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
            )
          }
          fromDate={fromDate}
          onFromDateChange={setFromDate}
          toDate={toDate}
          onToDateChange={setToDate}
          onRefresh={loadData}
          onExport={exportCsv}
          loading={loading}
        />

        <Card className="overflow-hidden">
          <ReportsTable
            reports={reports}
            loading={loading}
            onView={openDetail}
            onAction={(kind, report) => setDialog({ kind, report })}
          />
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-ink-muted">
            <span>
              {total} report{total === 1 ? '' : 's'} • page {currentPage} of{' '}
              {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                disabled={offset === 0 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                size="sm"
                onClick={() => setOffset(offset + LIMIT)}
                disabled={offset + LIMIT >= total || loading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {selected && (
          <ReportDrawer
            report={selected}
            timeline={timeline}
            timelineLoading={timelineLoading}
            onClose={closeDetail}
            onAction={(kind) => setDialog({ kind, report: selected })}
          />
        )}
      </AnimatePresence>

      {dialog && (
        <ActionDialog
          dialog={dialog}
          onCancel={() => setDialog(null)}
          onConfirm={runAction}
        />
      )}
    </>
  );
}

// ============================================================================
// SummaryPills
// ============================================================================

function SummaryPills({
  summary,
  loading,
}: {
  summary: IncidentReportSummary | null;
  loading: boolean;
}) {
  if (!summary) return null;
  const items: Array<{ label: string; count: number; tone: string }> = [
    {
      label: 'Awaiting Review',
      count: summary.pending_review,
      tone: 'text-blue-700',
    },
    {
      label: 'Needs Revision',
      count: summary.request_revision,
      tone: 'text-amber-700',
    },
    { label: 'Approved', count: summary.approved, tone: 'text-emerald-700' },
    { label: 'Total', count: summary.total, tone: 'text-ink' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} className="p-4">
          <div className="text-xs text-ink-muted">{it.label}</div>
          <div
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              it.tone
            } ${loading ? 'opacity-50' : ''}`}
          >
            {it.count}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// FilterBar
// ============================================================================

function FilterBar({
  triggerSources,
  onToggleTrigger,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  onRefresh,
  onExport,
  loading,
}: {
  triggerSources: TriggerSource[];
  onToggleTrigger: (t: TriggerSource) => void;
  fromDate: string;
  onFromDateChange: (v: string) => void;
  toDate: string;
  onToDateChange: (v: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  loading: boolean;
}) {
  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-medium text-ink-muted">Trigger:</span>
        {TRIGGER_OPTIONS.map((opt) => {
          const active = triggerSources.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => onToggleTrigger(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                active
                  ? 'bg-ink text-white'
                  : 'bg-ink/[0.07] text-ink-muted hover:bg-ink/[0.12]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
        <span className="ml-3 font-medium text-ink-muted">Date:</span>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
          className="rounded-md border border-line bg-white px-2 py-1 text-xs"
        />
        <span className="text-ink-muted">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => onToDateChange(e.target.value)}
          className="rounded-md border border-line bg-white px-2 py-1 text-xs"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={onExport} disabled={loading}>
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// ReportsTable
// ============================================================================

function ReportsTable({
  reports,
  loading,
  onView,
  onAction,
}: {
  reports: IncidentReportEntity[];
  loading: boolean;
  onView: (r: IncidentReportEntity) => void;
  onAction: (kind: DialogKind, r: IncidentReportEntity) => void;
}) {
  if (loading && reports.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-muted">Loading…</div>
    );
  }
  if (!loading && reports.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-muted">
        No reports match the current filters.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-ink/[0.02] text-xs text-ink-muted">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Submitted</th>
            <th className="px-4 py-2 text-left font-medium">Trigger</th>
            <th className="px-4 py-2 text-left font-medium">Claimed By</th>
            <th className="px-4 py-2 text-left font-medium">Incident</th>
            <th className="px-4 py-2 text-left font-medium">Report</th>
            <th className="px-4 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => {
            const actions = rowActionsFor(r);
            return (
              <tr
                key={r.id}
                className="border-b border-line last:border-b-0 hover:bg-ink/[0.02]"
              >
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">
                  {r.submitted_at ? formatDateTime(r.submitted_at) : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">
                  {r.incident_trigger_source}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">
                  {r.incident_claimed_by_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs">
                  <IncidentBadge status={r.incident_status} />
                  {r.needs_incident_verification && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      verify
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  <ReportBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    {actions.map((a) => (
                      <Button
                        key={a.kind}
                        size="sm"
                        variant={a.variant}
                        onClick={() => onAction(a.kind, r)}
                      >
                        {a.label}
                      </Button>
                    ))}
                    <Button size="sm" onClick={() => onView(r)}>
                      View
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Badges
// ============================================================================

function IncidentBadge({ status }: { status: IncidentReportEntity['incident_status'] }) {
  const cls =
    status === 'RESOLVED'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'CANCELLED'
      ? 'bg-gray-100 text-gray-700'
      : status === 'ESCALATED'
      ? 'bg-red-100 text-red-700'
      : status === 'AWAITING_VERIFICATION'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-blue-100 text-blue-700';
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {status}
    </span>
  );
}

function ReportBadge({ status }: { status: IncidentReportEntity['status'] }) {
  const cls =
    status === 'approved'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'needs_revision'
      ? 'bg-amber-100 text-amber-700'
      : status === 'draft'
      ? 'bg-gray-100 text-gray-700'
      : status === 'under_review'
      ? 'bg-violet-100 text-violet-700'
      : 'bg-blue-100 text-blue-700';
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {status}
    </span>
  );
}

// ============================================================================
// ReportDrawer
// ============================================================================

function ReportDrawer({
  report,
  timeline,
  timelineLoading,
  onClose,
  onAction,
}: {
  report: IncidentReportEntity;
  timeline: IncidentTimelineEvent[];
  timelineLoading: boolean;
  onClose: () => void;
  onAction: (kind: DialogKind) => void;
}) {
  const actions = rowActionsFor(report);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: DUR.base, ease: EASE.out }}
        className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-ink-muted" />
            <div>
              <h2 className="text-sm font-semibold text-ink">Incident Report</h2>
              <p className="text-[11px] text-ink-muted">{report.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-ink/[0.05]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-4">
          {/* Report */}
          <section>
            <h3 className="text-sm font-semibold text-ink">Report</h3>
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <Field label="Status">
                <ReportBadge status={report.status} />
              </Field>
              <Field label="Disposition">
                {report.disposition ?? '—'}
              </Field>
              <Field label="Submitted By">
                {report.submitted_by_id ?? '—'}
              </Field>
              <Field label="Submitted At">
                {report.submitted_at
                  ? formatDateTime(report.submitted_at)
                  : '—'}
              </Field>
              <Field label="Reviewed By">
                {report.reviewed_by ?? '—'}
              </Field>
              <Field label="Reviewed At">
                {report.reviewed_at
                  ? formatDateTime(report.reviewed_at)
                  : '—'}
              </Field>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div>
                <div className="text-[11px] font-medium text-ink-muted">
                  Summary
                </div>
                <p className="mt-0.5 text-ink">{report.summary}</p>
              </div>
              {report.detailed_narrative && (
                <div>
                  <div className="text-[11px] font-medium text-ink-muted">
                    Narrative
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-ink">
                    {report.detailed_narrative}
                  </p>
                </div>
              )}
              {report.reviewer_notes && (
                <div>
                  <div className="text-[11px] font-medium text-ink-muted">
                    Reviewer Notes
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-ink">
                    {report.reviewer_notes}
                  </p>
                </div>
              )}
              {report.evidence_urls.length > 0 && (
                <div>
                  <div className="text-[11px] font-medium text-ink-muted">
                    Evidence
                  </div>
                  <ul className="mt-1 space-y-1">
                    {report.evidence_urls.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-blue-600 underline hover:text-blue-800"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Incident */}
          <section>
            <h3 className="text-sm font-semibold text-ink">Incident</h3>
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <Field label="Status">
                <IncidentBadge status={report.incident_status} />
              </Field>
              <Field label="Trigger">{report.incident_trigger_source}</Field>
              <Field label="Threat Category">
                {report.incident_threat_category}
              </Field>
              <Field label="Threat Level">{report.incident_threat_level}</Field>
              <Field label="Claimed By">
                {report.incident_claimed_by_name ?? '—'}
              </Field>
              <Field label="Verified At">
                {report.incident_verified_at
                  ? formatDateTime(report.incident_verified_at)
                  : 'not verified'}
              </Field>
            </div>
            {report.needs_incident_verification && (
              <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mr-1 inline h-3 w-3" />
                This incident requires second-person verification before it
                can be resolved.
              </div>
            )}
          </section>

          {/* Actions */}
          {actions.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-ink">Actions</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {actions.map((a) => (
                  <Button
                    key={a.kind}
                    variant={a.variant}
                    onClick={() => onAction(a.kind)}
                  >
                    {a.kind === 'verify' && <Shield className="mr-1 h-4 w-4" />}
                    {a.kind === 'resolve' && (
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                    )}
                    {a.kind === 'approve' && (
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                    )}
                    {a.kind === 'reject' && (
                      <XCircle className="mr-1 h-4 w-4" />
                    )}
                    {a.label}
                  </Button>
                ))}
              </div>
            </section>
          )}

          {/* Timeline */}
          <section>
            <h3 className="text-sm font-semibold text-ink">Timeline</h3>
            {timelineLoading ? (
              <p className="mt-2 text-xs text-ink-muted">Loading timeline…</p>
            ) : timeline.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">
                No timeline events available.
              </p>
            ) : (
              <ol className="mt-2 space-y-2">
                {timeline.map((e, i) => (
                  <li
                    key={`${e.kind}-${e.at}-${i}`}
                    className="flex gap-3 text-xs"
                  >
                    <div className="w-24 shrink-0 text-ink-muted">
                      {formatDateTime(e.at)}
                    </div>
                    <div>
                      <div className="font-medium text-ink">
                        {humanizeKind(e.kind)}
                      </div>
                      {e.actor_name && (
                        <div className="text-ink-muted">by {e.actor_name}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium text-ink-muted">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

// ============================================================================
// ActionDialog
// ============================================================================

function ActionDialog({
  dialog,
  onCancel,
  onConfirm,
}: {
  dialog: DialogState;
  onCancel: () => void;
  onConfirm: (
    kind: DialogKind,
    notes: string,
    outcome?: IncidentOutcome,
  ) => Promise<void>;
}) {
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<IncidentOutcome>('confirmed');
  const [submitting, setSubmitting] = useState(false);

  const isResolve = dialog.kind === 'resolve';
  const requiresNotes = dialog.kind === 'reject';
  const title =
    dialog.kind === 'approve'
      ? 'Approve Report'
      : dialog.kind === 'reject'
      ? 'Request Revision'
      : dialog.kind === 'verify'
      ? 'Verify Incident'
      : 'Resolve Incident';

  const handleConfirm = async () => {
    if (requiresNotes && !notes.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(dialog.kind, notes.trim(), isResolve ? outcome : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            Report {dialog.report.id.slice(0, 8)}… • incident{' '}
            {dialog.report.incident_id.slice(0, 8)}…
          </p>
        </div>
        <div className="space-y-3 p-4">
          {isResolve ? (
            <div className="grid grid-cols-2 gap-2">
              <OutcomeButton
                selected={outcome === 'confirmed'}
                onClick={() => setOutcome('confirmed')}
                title="Confirmed"
                subtitle="Real incident, correctly handled."
              />
              <OutcomeButton
                selected={outcome === 'false_positive'}
                onClick={() => setOutcome('false_positive')}
                title="False Positive"
                subtitle="Report does not describe a real incident."
              />
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-medium text-ink-muted">
                Notes{requiresNotes ? ' (required)' : ' (optional)'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder={
                  requiresNotes
                    ? 'Explain what needs to change…'
                    : 'Optional context…'
                }
                className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <Button onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={dialog.kind === 'reject' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={submitting || (requiresNotes && !notes.trim())}
          >
            {submitting ? 'Working…' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function OutcomeButton({
  selected,
  onClick,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-left transition ${
        selected
          ? 'border-ink bg-ink/[0.05]'
          : 'border-line hover:border-ink/40'
      }`}
    >
      <div className="text-xs font-semibold text-ink">{title}</div>
      <div className="mt-0.5 text-[11px] text-ink-muted">{subtitle}</div>
    </button>
  );
}