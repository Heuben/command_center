import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CogIcon, DownloadIcon, UserSearchIcon, XIcon } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { useCommandCenters } from '../contexts/CommandCenterContext';
import { api } from '../lib/api';
import type { AuditAction, AuditCategory, SystemAuditLog } from '../types';
import {
  actionCategory,
  actionLabel,
  categoryLabel,
  targetEntityLabel
} from '../utils/labels';
import { formatDateTime } from '../utils/time';
import { DataTable } from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { MultiSelect } from '../components/ui/MultiSelect';
import type { MultiSelectOption } from '../components/ui/MultiSelect';
import { Button, Card, EmptyState, Input, Label, PageHeader } from '../components/ui/primitives';
import { Drawer } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { downloadCsv, rowsToCsv, type Column as CSVColumn } from '../utils/csv';
import { DUR, EASE } from '../lib/motion';

/**
 * All cell renderers wrap their content in `.cellStack` so every row is
 * exactly two uniform lines tall. The second <p> is a transparent spacer
 * for cells that only have a single meaningful line (e.g. a status badge
 * or a date). This keeps badges and dates visually aligned with the
 * second line of multi-line cells in the same row.
 */
const cellStack = 'flex flex-col gap-0.5 leading-[1.25]';
const spacer = (
  <p className="text-[12px] leading-[1.25] text-transparent select-none" aria-hidden>
    &nbsp;
  </p>
);

const categoryTone: Record<
  AuditCategory,
  'primary' | 'neutral' | 'urgent' | 'success' | 'danger'> =
{
  personnel: 'primary',
  incidents: 'urgent',
  outcome_reviews: 'danger',
  system: 'neutral'
};

const ACTOR_SYSTEM = '__system__';

export function AuditLogs() {
  const { isSuperadmin, scopeCenterId } = useSession();
  const { centerName, ready: commandCentersReady } = useCommandCenters();
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const cursorRef = useRef<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [categories, setCategories] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [actors, setActors] = useState<string[]>([]); // stores actor_id or ACTOR_SYSTEM
  const [actorOptions, setActorOptions] = useState<MultiSelectOption[]>([
    { value: ACTOR_SYSTEM, label: 'System (automated)' }
  ]);
  const [actorOptionsLoading, setActorOptionsLoading] = useState(false);
  const [actorOptionsError, setActorOptionsError] = useState<string | null>(null);
  const actorOptionsRequestId = useRef(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<SystemAuditLog | null>(null);

  useEffect(() => {
    actorOptionsRequestId.current += 1;
    setActors([]);
    setActorOptions([{ value: ACTOR_SYSTEM, label: 'System (automated)' }]);
    setActorOptionsError(null);
    setActorOptionsLoading(false);
  }, [scopeCenterId]);

  const loadActorOptions = useCallback(async () => {
    if (!scopeCenterId) {
      setActorOptionsError('Select a command center from Branch Context to load actors.');
      return;
    }

    const requestId = ++actorOptionsRequestId.current;
    setActorOptionsLoading(true);
    setActorOptionsError(null);
    try {
      const branchActors = await api.getBranchActors(scopeCenterId);
      if (requestId === actorOptionsRequestId.current) {
        setActorOptions([
          { value: ACTOR_SYSTEM, label: 'System (automated)' },
          ...branchActors.map(({ id, name }) => ({ value: id, label: name }))
        ]);
      }
    } catch (err) {
      if (requestId === actorOptionsRequestId.current) {
        setActorOptionsError(err instanceof Error ? err.message : 'Failed to load actors.');
      }
    } finally {
      if (requestId === actorOptionsRequestId.current) {
        setActorOptionsLoading(false);
      }
    }
  }, [scopeCenterId]);

  // Build filter object for API
  const filters = {
    category: categories.length ? categories[0] as AuditCategory : undefined, // We'll take the first category for simplicity, but note: MultiSelect allows multiple
    action: actions.length ? actions[0] as AuditAction : undefined, // Similarly, we'll take the first action
    actor: actors.length ? (actors[0] === ACTOR_SYSTEM ? null : actors[0]) : undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59Z`).toISOString() : undefined,
    commandCenterId: scopeCenterId ?? undefined
  };

  // Fetch logs function
  const fetchLogs = useCallback(async (reset = false) => {
    if (reset) {
      cursorRef.current = null;
      setHasNextPage(false);
    }
    setLoading(true);
    setError(null);
    try {
      const limit = 50; // Page size
      const result = await api.auditLogs(
        limit,
        cursorRef.current,
        filters.commandCenterId,
        filters.category,
        filters.action,
        filters.actor,
        filters.from,
        filters.to
      );
      setLogs(prev => reset ? result.data : [...prev, ...result.data]);
      cursorRef.current = result.cursor;
      setHasNextPage(result.hasNextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [
    filters.action,
    filters.actor,
    filters.category,
    filters.commandCenterId,
    filters.from,
    filters.to
  ]);

  // Refetch when filters change
  useEffect(() => {
    fetchLogs(true);
  }, [fetchLogs]);

  // Load more function
  const loadMore = () => {
    if (hasNextPage && !loading) {
      fetchLogs(false);
    }
  };

  const filterCount =
    categories.length + actions.length + actors.length + (from ? 1 : 0) + (to ? 1 : 0);

  const exportVisible = () => {
    // Export the current logs array (the page we have fetched)
    const cols: CSVColumn<{ created_at: string; actor: string; action: string; category: string; target_entity: string; reference: string; branch: string }>[] = [
      { key: 'created_at', header: 'Timestamp' },
      { key: 'actor', header: 'Actor' },
      { key: 'action', header: 'Action' },
      { key: 'category', header: 'Category' },
      { key: 'target_entity', header: 'Target Entity' },
      { key: 'reference', header: 'Reference' },
      { key: 'branch', header: 'Branch' }
    ];
    const records = logs.map((l) => ({
      created_at: formatDateTime(l.created_at),
      actor: l.actor_name ?? l.actor_id ?? 'System',
      action: actionLabel[l.action],
      category: categoryLabel[actionCategory[l.action]],
      target_entity: targetEntityLabel[l.target_entity],
      reference: l.reference,
      branch: l.command_center_id ? (() => {
        // We don't have centerName function here
        return l.command_center_id;
      })() : 'System-wide'
    }));
    downloadCsv(
      `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCsv(records, cols)
    );
  };

  const clearAll = () => {
    setCategories([]);
    setActions([]);
    setActors([]);
    setFrom('');
    setTo('');
  };

  const columns: Column<SystemAuditLog>[] = [
  {
    key: 'timestamp',
    header: 'Timestamp',
    sortable: true,
    width: '200px',
    sortValue: (l) => l.created_at,
    render: (l) =>
    <div className={cellStack}>
        <span className="whitespace-nowrap text-[13px] leading-[1.25] tabular-nums text-ink-muted">
          {formatDateTime(l.created_at)}
        </span>
        {spacer}
      </div>

  },
  {
    key: 'actor',
    header: 'Actor',
    sortable: true,
    sortValue: (l) => l.actor_name ?? l.actor_id ?? 'System',
    render: (l) => {
      if (!l.actor_name && !l.actor_id) {
        return (
          <div className={cellStack}>
            <span className="inline-flex items-center gap-1.5 text-[13px] leading-[1.25] italic text-ink-muted">
              <CogIcon className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
              System
            </span>
            {spacer}
          </div>);
      }
      return (
        <div className={cellStack}>
          <div className="min-w-0">
            <p className="truncate text-[13px] leading-[1.25] font-medium text-ink">{l.actor_name ?? l.actor_id}</p>
            {/* We don't have roleLabel without userById, so we'll skip */}
          </div>
        </div>);
    }
  },
  {
    key: 'action',
    header: 'Action',
    sortable: true,
    sortValue: (l) => actionLabel[l.action],
    render: (l) =>
    <div className={cellStack}>
        <p className="truncate text-[13px] leading-[1.25] text-ink">{actionLabel[l.action]}</p>
        {spacer}
      </div>

  },
  {
    key: 'category',
    header: 'Category',
    sortable: true,
    width: '160px',
    sortValue: (l) => categoryLabel[actionCategory[l.action]],
    render: (l) =>
    <div className={cellStack}>
        <div>
          <Badge tone={categoryTone[actionCategory[l.action]]} variant="dot">
            {categoryLabel[actionCategory[l.action]]}
          </Badge>
        </div>
        {spacer}
      </div>

  },
  {
    key: 'entity',
    header: 'Target Entity',
    sortable: true,
    sortValue: (l) => targetEntityLabel[l.target_entity],
    render: (l) =>
    <div className={cellStack}>
        <p className="truncate text-[13px] leading-[1.25] text-ink-muted">{targetEntityLabel[l.target_entity]}</p>
        {spacer}
      </div>

  },
  ...(isSuperadmin && !scopeCenterId ?
  [{
    key: 'branch',
    header: 'Branch',
    sortable: true,
    sortValue: (l: SystemAuditLog) => l.command_center_id ? l.command_center_id : 'System-wide',
    render: (l: SystemAuditLog) =>
    <div className={cellStack}>
        <p className="truncate text-[13px] leading-[1.25] text-ink-muted">
          {l.command_center_id ? l.command_center_id : 'System-wide'}
        </p>
        {spacer}
      </div>

  }] :

  [])];


  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle={
        isSuperadmin ?
        scopeCenterId ?
        `Every recorded action at ${centerName(scopeCenterId)}` :
        'Every recorded action across all command centers' :
        `Every recorded action at ${
          scopeCenterId
            ? commandCentersReady
              ? centerName(scopeCenterId)
              : 'Loading command center…'
            : 'your command center'
        }`
        } />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full min-w-0 sm:w-[180px]">
            <Label>Category</Label>
            <MultiSelect
              ariaLabel="Filter by category"
              placeholder="All Categories"
              options={Object.keys(categoryLabel).map((c) => ({
                value: c,
                label: categoryLabel[c as AuditCategory],
                hint: '' // We don't have hint now because we don't have the logs array to count
              })) as {value: AuditCategory; label: string; hint: string}[]}
              selected={categories}
              onChange={setCategories} />
          </div>

          <div className="w-full min-w-0 sm:w-[220px]">
            <Label>Action</Label>
            <MultiSelect
              ariaLabel="Filter by action"
              placeholder="Select Actions..."
              options={Object.keys(actionLabel).map((a) => ({
                value: a,
                label: actionLabel[a as AuditAction],
                hint: ''
              })) as {value: AuditAction; label: string; hint: string}[]}
              selected={actions}
              onChange={setActions}
              searchable />
          </div>

          <div className="w-full min-w-0 sm:w-44">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full" />
          </div>

          <div className="w-full min-w-0 sm:w-44">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full" />
          </div>

          <div className="ml-auto flex w-full flex-wrap items-end gap-2 sm:w-auto">
            <MultiSelect
              variant="button"
              ariaLabel="Filter by actor"
              placeholder="Filter Actor"
              icon={<UserSearchIcon className="h-4 w-4 shrink-0 opacity-70" />}
              options={actorOptions}
              selected={actors}
              onChange={setActors}
              onOpen={() => void loadActorOptions()}
              statusMessage={
                actorOptionsLoading
                  ? 'Loading actors…'
                  : actorOptionsError ?? undefined
              }
              searchable
              className="w-full sm:w-[190px]"
              panelClassName="min-w-[280px]" />

            <Button className="w-full sm:w-auto" onClick={exportVisible} disabled={logs.length === 0}>
              <DownloadIcon className="h-4 w-4" />
              Export CSV ({logs.length})
            </Button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {filterCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto', transition: { duration: DUR.base, ease: EASE.out } }}
              exit={{ opacity: 0, height: 0, transition: { duration: DUR.fast, ease: EASE.in } }}
              className="overflow-hidden">
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                {categories.map((c) =>
                  <Chip
                    key={`c-${c}`}
                    label={`Category: ${categoryLabel[c as AuditCategory]}`}
                    onRemove={() => setCategories(categories.filter((v) => v !== c))} />
                )}
                {actions.map((a) =>
                  <Chip
                    key={`a-${a}`}
                    label={`Action: ${actionLabel[a as AuditAction]}`}
                    onRemove={() => setActions(actions.filter((v) => v !== a))} />
                )}
                {actors.map((a) =>
                  <Chip
                    key={`u-${a}`}
                    label={`Actor: ${a === ACTOR_SYSTEM ? 'System' : a}`}
                    onRemove={() => setActors(actors.filter((v) => v !== a))} />
                )}
                {from && <Chip label={`From: ${from}`} onRemove={() => setFrom('')} />}
                {to && <Chip label={`To: ${to}`} onRemove={() => setTo('')} />}
                <button
                  onClick={clearAll}
                  className="ml-1 text-[12px] font-medium text-primary transition-colors duration-150 ease-out hover:underline">
                  Clear all
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-ink">Chronological Timeline</h2>
          <p className="text-[13px] tabular-nums text-ink-muted">
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
            {filterCount > 0 && ` of ${hasNextPage ? 'more available' : 'no more'}`}
          </p>
        </div>
        {error && (
          <p role="alert" className="border-b border-danger/25 bg-danger-soft/50 px-4 py-3 text-[13px] text-danger">
            {error}
          </p>
        )}
        <DataTable
          columns={columns}
          rows={logs}
          rowKey={(l) => l.id}
          onRowClick={(l) => setSelected(l)}
          defaultSort={{ key: 'timestamp', dir: 'desc' }}
          empty={
          <EmptyState
            title="No matching entries"
            description="Try clearing a facet or widening the date range." />
          } />

        {/* Load more button if there is a next page */}
        {hasNextPage && !loading && (
          <div className="flex justify-center py-4">
            <Button onClick={loadMore}>Load more</Button>
          </div>
        )}
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? actionLabel[selected.action] : ''}
        subtitle={selected ?
          `${categoryLabel[actionCategory[selected.action]]} · ${targetEntityLabel[selected.target_entity]} · ${selected.reference}` :
          ''
        }>
        {selected &&
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Actor</p>
                {selected.actor_name || selected.actor_id ? (
                  <p className="text-[13px] font-medium text-ink">
                    {selected.actor_name ?? selected.actor_id}
                    {/* We don't have roleLabel without userById */}
                  </p>
                ) : (
                  <p className="inline-flex items-center gap-1.5 text-[13px] italic text-ink-muted">
                    <CogIcon className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                    System
                  </p>
                )}
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Timestamp</p>
                <p className="text-[13px] tabular-nums text-ink">
                  {formatDateTime(selected.created_at)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Category</p>
                <Badge tone={categoryTone[actionCategory[selected.action]]} variant="dot">
                  {categoryLabel[actionCategory[selected.action]]}
                </Badge>
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Branch</p>
                <p className="text-[13px] text-ink">
                  {selected.command_center_id ?
                  selected.command_center_id :
                  'System-wide'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DiffBlock title="Previous Value" value={selected.old_value} tone="danger" />
              <DiffBlock title="New Value" value={selected.new_value} tone="success" />
            </div>
          </div>
        }
      </Drawer>
    </>
  );
}

function Chip({ label, onRemove }: {label: string;onRemove: () => void;}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
      exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.1, ease: [0.4, 0, 1, 1] } }}
      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-canvas py-1 pl-2.5 pr-1.5 text-[12px] text-ink">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="rounded-sm p-0.5 text-ink-faint transition-colors duration-150 ease-out hover:bg-ink/[0.08] hover:text-ink">
      <XIcon className="h-3 w-3" />
    </button>
  </motion.span>);
}

function DiffBlock({
  title,
  value,
  tone
}: {title: string;value: Record<string, unknown> | null;tone: 'danger' | 'success';}) {
  if (!value) {
    return (
      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink-faint">{title}</p>
        <div
          className={
          'rounded-md border px-3 py-2.5 text-[13px] italic ' + (
          tone === 'danger' ?
          'border-danger/25 bg-danger-soft/50 text-danger' :
          'border-success/25 bg-success-soft/50 text-success')
          }>
          No data
        </div>
      </div>
      );
      }

  return (
    <div>
      <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink-faint">{title}</p>
      <div
        className={
        'rounded-md border px-3 py-2.5 ' + (
        tone === 'danger' ?
        'border-danger/25 bg-danger-soft/50' :
        'border-success/25 bg-success-soft/50')
        }>
        <dl className="space-y-2">
          {Object.entries(value).map(([k, v]) => (
          <div key={k} className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-muted sm:w-1/3 sm:shrink-0">
                {k.replace(/_/g, ' ')}
              </dt>
              <dd className="min-w-0 flex-1 break-words text-[13px] font-medium text-ink">
                {v === null ?
              <span className="italic text-ink-faint">null</span> :
              typeof v === 'boolean' ?
              v ?
              'Yes' :
              'No' :

              typeof v === 'object' ?
              JSON.stringify(v) :

              String(v)
              }
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}