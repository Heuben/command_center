import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DownloadIcon } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { useDispatchData } from '../contexts/DispatchContext';
import { alerts } from '../data/alerts';
import { centerName } from '../data/commandCenters';
import { IncidentLogTable, type IncidentLogRow } from '../components/incidents/IncidentLogTable';
import { PostIncidentReportsTable } from '../components/incidents/PostIncidentReportsTable';
import { CivilianReportsTable } from '../components/incidents/CivilianReportsTable';
import { Button, Card, PageHeader, Segmented } from '../components/ui/primitives';
import { rowsToCsv, downloadCsv } from '../utils/csv';
import type { CivilianReport, IncidentReport } from '../types';
import { formatDateTime } from '../utils/time';
import { DUR, EASE } from '../lib/motion';

type View = 'all' | 'log' | 'reports' | 'civilian';

export function IncidentHistory() {
  const { scopeCenterId, isSuperadmin } = useSession();
  const { branchResponses, reports, civilianReports } = useDispatchData();
  const [view, setView] = useState<View>('all');

  const showBranch = isSuperadmin && !scopeCenterId;

  const logRows = useMemo<IncidentLogRow[]>(
    () =>
    branchResponses.
    filter((r) => !scopeCenterId || r.command_center_id === scopeCenterId).
    map((response) => ({ response, alert: alerts.find((a) => a.id === response.alert_id)! })).
    filter((r) => !!r.alert),
    [branchResponses, scopeCenterId]
  );

  const reportRows = useMemo(
    () => reports.filter((r) => !scopeCenterId || r.command_center_id === scopeCenterId),
    [reports, scopeCenterId]
  );

  const civilianRows = useMemo(
    () => civilianReports.filter((r) => !scopeCenterId || r.command_center_id === scopeCenterId),
    [civilianReports, scopeCenterId]
  );

  const pendingCivilian = civilianRows.filter((r) => r.status === 'pending').length;

  const exportIncidentLog = () => {
    const cols = [
    { key: 'alert_id', header: 'Alert ID' },
    { key: 'type', header: 'Alert Type' },
    { key: 'address', header: 'Address' },
    { key: 'branch', header: 'Branch' },
    { key: 'status', header: 'Status' },
    { key: 'triggered', header: 'Triggered At' },
    { key: 'acknowledged', header: 'Acknowledged At' },
    { key: 'dispatched', header: 'Dispatched At' },
    { key: 'arrived', header: 'Arrived At' },
    { key: 'resolved', header: 'Resolved At' }] as
    const;
    const records = logRows.map((r) => ({
      alert_id: r.alert.id,
      type: r.alert.alert_type,
      address: r.alert.address,
      branch: showBranch ? centerName(r.response.command_center_id) : '',
      status: r.response.status,
      triggered: formatDateTime(r.response.triggered_at),
      acknowledged: r.response.acknowledged_at ? formatDateTime(r.response.acknowledged_at) : '',
      dispatched: r.response.dispatched_at ? formatDateTime(r.response.dispatched_at) : '',
      arrived: r.response.arrived_at ? formatDateTime(r.response.arrived_at) : '',
      resolved: r.response.resolved_at ? formatDateTime(r.response.resolved_at) : ''
    }));
    downloadCsv(
      `incident-log-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCsv(records, cols)
    );
  };

  const exportReports = () => {
    const cols = [
    { key: 'id', header: 'Report ID' },
    { key: 'alert_id', header: 'Alert ID' },
    { key: 'branch', header: 'Branch' },
    { key: 'summary', header: 'Summary' },
    { key: 'status', header: 'Status' },
    { key: 'submitted_at', header: 'Submitted At' }] as
    const;
    const records: Record<string, string>[] = reportRows.map((r: IncidentReport) => ({
      id: r.id,
      alert_id: r.alert_id,
      branch: showBranch ? centerName(r.command_center_id) : '',
      summary: r.summary,
      status: r.status,
      submitted_at: r.submitted_at ? formatDateTime(r.submitted_at) : ''
    }));
    downloadCsv(
      `incident-reports-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCsv(records, cols)
    );
  };

  const exportCivilian = () => {
    const cols = [
    { key: 'id', header: 'Report ID' },
    { key: 'branch', header: 'Branch' },
    { key: 'civilian_name', header: 'Civilian Name' },
    { key: 'location', header: 'Location' },
    { key: 'statement', header: 'Statement' },
    { key: 'status', header: 'Status' },
    { key: 'submitted_at', header: 'Submitted At' }] as
    const;
    const records: Record<string, string>[] = civilianRows.map((r: CivilianReport) => ({
      id: r.id,
      branch: showBranch ? centerName(r.command_center_id) : '',
      civilian_name: r.civilian_name,
      location: r.human_location,
      statement: r.statement ?? '',
      status: r.status,
      submitted_at: formatDateTime(r.submitted_at)
    }));
    downloadCsv(
      `civilian-reports-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCsv(records, cols)
    );
  };

  const sections = {
    log:
    <CategoryCard
      key="log"
      title="Incident Log"
      description="Raw alerts and each branch's response timeline."
      count={logRows.length}
      exportLabel="Incident Log"
      onExport={exportIncidentLog}>
        <IncidentLogTable rows={logRows} showBranch={showBranch} />
      </CategoryCard>,


    reports:
    <CategoryCard
      key="reports"
      title="Post-Incident Reports"
      description="Written narratives filed after an incident is handled."
      count={reportRows.length}
      exportLabel="Post-Incident Reports"
      onExport={exportReports}>
        <PostIncidentReportsTable rows={reportRows} showBranch={showBranch} />
      </CategoryCard>,


    civilian:
    <CategoryCard
      key="civilian"
      title="Civilian Reports"
      description="Reports and media submitted by civilians."
      count={civilianRows.length}
      pending={pendingCivilian}
      exportLabel="Civilian Reports"
      onExport={exportCivilian}>
        <CivilianReportsTable rows={civilianRows} showBranch={showBranch} />
      </CategoryCard>

  };

  return (
    <>
      <PageHeader
        title={isSuperadmin ? 'Incident History & Reports' : 'Incidents & Reporting'}
        subtitle={
        scopeCenterId ?
        `Records for ${centerName(scopeCenterId)}` :
        'Records across all command centers'
        }
        actions={
        <Segmented<View>
          ariaLabel="Record category"
          value={view}
          onChange={setView}
          options={[
          { value: 'all', label: 'All' },
          { value: 'log', label: 'Incident Log', count: logRows.length },
          { value: 'reports', label: 'Post-Incident Reports', count: reportRows.length },
          { value: 'civilian', label: 'Civilian Reports', count: civilianRows.length }]
          } />

        } />
      

      <AnimatePresence>
        {pendingCivilian > 0 && view !== 'reports' && view !== 'log' && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } }}
            exit={{ opacity: 0, y: -4, transition: { duration: DUR.fast, ease: EASE.in } }}
            className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-urgent/30 bg-urgent-soft px-4 py-3">
            <p className="text-[13px] font-medium text-urgent">
              {pendingCivilian} civilian{' '}
              {pendingCivilian === 1 ? 'report needs' : 'reports need'} to be acknowledged.
            </p>
            <Button size="sm" variant="primary" onClick={() => setView('civilian')}>
              View Reports
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {view === 'all' ?
        [sections.log, sections.reports, sections.civilian] :
        sections[view]}
      </div>
    </>);

}

function CategoryCard({
  title,
  description,
  count,
  pending,
  exportLabel,
  onExport,
  children








}: {title: string;description: string;count: number;pending?: number;exportLabel: string;onExport?: () => void;children: React.ReactNode;}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            <span className="rounded-full bg-ink/[0.07] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-ink-muted">
              {count}
            </span>
            {typeof pending === 'number' && pending > 0 &&
            <span className="rounded-full bg-urgent px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                {pending} pending
              </span>
            }
          </div>
          <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {onExport &&
          <Button size="sm" onClick={onExport}>
              <DownloadIcon className="h-4 w-4" />
              Export {exportLabel} (CSV)
            </Button>
          }
        </div>
      </div>
      {children}
    </Card>);

}