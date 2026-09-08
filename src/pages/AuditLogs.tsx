import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CogIcon, DownloadIcon, UserSearchIcon, XIcon } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { useDispatchData } from '../contexts/DispatchContext';
import { superadminOnlyActions } from '../data/auditLogs';
import { userById, userName } from '../data/users';
import { centerName } from '../data/commandCenters';
import type { AuditAction, AuditCategory, SystemAuditLog } from '../types';
import {
  actionCategory,
  actionLabel,
  categoryLabel,
  roleLabel,
  targetEntityLabel } from
'../utils/labels';
import { formatDateTime } from '../utils/time';
import { DataTable } from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { MultiSelect } from '../components/ui/MultiSelect';
import { Button, Card, EmptyState, Input, Label, PageHeader } from '../components/ui/primitives';
import { Drawer } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { downloadCsv, rowsToCsv } from '../utils/csv';
import { DUR, EASE } from '../lib/motion';

const cellStack = 'flex flex-col gap-0.5 leading-[1.25]';
const spacer = (
  <p className="text-[12px] text-transparent select-none" aria-hidden>
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
  const { logs } = useDispatchData();

  const [categories, setCategories] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [actors, setActors] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<SystemAuditLog | null>(null);

  /** Role + branch scoping happens before any facet filter. */
  const scoped = useMemo(
    () =>
    logs.filter((l) =>
    isSuperadmin ?
    !scopeCenterId || l.command_center_id === scopeCenterId :
    l.command_center_id === scopeCenterId &&
    !superadminOnlyActions.includes(l.action)
    ),
    [logs, isSuperadmin, scopeCenterId]
  );

  const categoryOptions = useMemo(() => {
    const present = new Set(scoped.map((l) => actionCategory[l.action]));
    return (Object.keys(categoryLabel) as AuditCategory[]).
    filter((c) => present.has(c)).
    map((c) => ({
      value: c,
      label: categoryLabel[c],
      hint: String(scoped.filter((l) => actionCategory[l.action] === c).length)
    }));
  }, [scoped]);

  const actionOptions = useMemo(() => {
    const pool = categories.length ?
    scoped.filter((l) => categories.includes(actionCategory[l.action])) :
    scoped;
    const present = Array.from(new Set(pool.map((l) => l.action)));
    return present.
    sort((a, b) => actionLabel[a].localeCompare(actionLabel[b])).
    map((a) => ({
      value: a,
      label: actionLabel[a],
      hint: String(pool.filter((l) => l.action === a).length)
    }));
  }, [scoped, categories]);

  const actorOptions = useMemo(() => {
    const ids = Array.from(new Set(scoped.map((l) => l.actor_id ?? ACTOR_SYSTEM)));
    return ids.
    map((id) => ({
      value: id,
      label:
      id === ACTOR_SYSTEM ?
      'System (automated)' :
      `${userName(id)} — ${roleLabel[userById(id)!.role]}`,
      hint: String(scoped.filter((l) => (l.actor_id ?? ACTOR_SYSTEM) === id).length)
    })).
    sort((a, b) => a.label.localeCompare(b.label));
  }, [scoped]);

  /** Drop any action that is no longer offered by the current category facet. */
  useEffect(() => {
    const allowed = new Set(actionOptions.map((o) => o.value));
    setActions((prev) => {
      const next = prev.filter((a) => allowed.has(a as AuditAction));
      return next.length === prev.length ? prev : next;
    });
  }, [actionOptions]);

  const visible = useMemo(
    () =>
    scoped.
    filter((l) => categories.length ? categories.includes(actionCategory[l.action]) : true).
    filter((l) => actions.length ? actions.includes(l.action) : true).
    filter((l) => actors.length ? actors.includes(l.actor_id ?? ACTOR_SYSTEM) : true).
    filter((l) => from ? l.created_at >= new Date(from).toISOString() : true).
    filter((l) => to ? l.created_at <= new Date(`${to}T23:59:59Z`).toISOString() : true).
    sort((a, b) => a.created_at < b.created_at ? 1 : -1),
    [scoped, categories, actions, actors, from, to]
  );

  const filterCount =
  categories.length + actions.length + actors.length + (from ? 1 : 0) + (to ? 1 : 0);

  const exportVisible = () => {
    const cols = [
    { key: 'created_at', header: 'Timestamp' },
    { key: 'actor', header: 'Actor' },
    { key: 'action', header: 'Action' },
    { key: 'category', header: 'Category' },
    { key: 'target_entity', header: 'Target Entity' },
    { key: 'reference', header: 'Reference' },
    { key: 'branch', header: 'Branch' }] as
    const;
    const records = visible.map((l) => ({
      created_at: formatDateTime(l.created_at),
      actor: l.actor_id ? userName(l.actor_id) : 'System',
      action: actionLabel[l.action],
      category: categoryLabel[actionCategory[l.action]],
      target_entity: targetEntityLabel[l.target_entity],
      reference: l.reference,
      branch: l.command_center_id ? centerName(l.command_center_id) : 'System-wide'
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
        <span className="whitespace-nowrap text-[13px] tabular-nums text-ink-muted">
              {formatDateTime(l.created_at)}
            </span>
        {spacer}
      </div>

  },
  {
    key: 'actor',
    header: 'Actor',
    sortable: true,
    sortValue: (l) => l.actor_id ? userName(l.actor_id) : 'System',
    render: (l) => {
      const actor = userById(l.actor_id);
      if (!actor) {
        return (
          <div className={cellStack}>
              <span className="inline-flex items-center gap-1.5 text-[13px] italic text-ink-muted">
                  <CogIcon className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                  System
                </span>
              {spacer}
            </div>);

      }
      return (
        <div className={cellStack}>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{userName(l.actor_id)}</p>
              <p className="truncate text-[12px] text-ink-muted">{roleLabel[actor.role]}</p>
            </div>
            {spacer}
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
        <div className="leading-tight">
            <p className="truncate text-[13px] text-ink">{actionLabel[l.action]}</p>
            <p className="truncate text-[12px] text-transparent select-none" aria-hidden>—</p>
          </div>
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
        <div className="leading-tight">
            <Badge tone={categoryTone[actionCategory[l.action]]} variant="dot">
              {categoryLabel[actionCategory[l.action]]}
            </Badge>
            <p className="text-[12px] text-transparent select-none" aria-hidden>—</p>
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
        <div className="leading-tight">
            <p className="truncate text-[13px] text-ink-muted">{targetEntityLabel[l.target_entity]}</p>
            <p className="text-[12px] text-transparent select-none" aria-hidden>—</p>
          </div>
        {spacer}
      </div>

  },
  {
    key: 'reference',
    header: 'Reference',
    sortable: true,
    width: '120px',
    sortValue: (l) => l.reference,
    render: (l) =>
    <div className={cellStack}>
        <div className="leading-tight">
            <p className="font-mono text-[12px] text-ink">{l.reference}</p>
            <p className="text-[12px] text-transparent select-none" aria-hidden>—</p>
          </div>
        {spacer}
      </div>

  },
  ...(isSuperadmin && !scopeCenterId ?
  [
  {
    key: 'branch',
    header: 'Branch',
    sortable: true,
    sortValue: (l: SystemAuditLog) => centerName(l.command_center_id),
    render: (l: SystemAuditLog) =>
    <div className={cellStack}>
        <div className="leading-tight">
            <p className="truncate text-[13px] text-ink-muted">
              {l.command_center_id ? centerName(l.command_center_id) : 'System-wide'}
            </p>
            <p className="text-[12px] text-transparent select-none" aria-hidden>—</p>
          </div>
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
        `Every recorded action at ${centerName(scopeCenterId)}`
        } />
      

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[180px]">
            <Label>Category</Label>
            <MultiSelect
              ariaLabel="Filter by category"
              placeholder="All Categories"
              options={categoryOptions}
              selected={categories}
              onChange={setCategories} />
            
          </div>

          <div className="w-[220px]">
            <Label>Action</Label>
            <MultiSelect
              ariaLabel="Filter by action"
              placeholder="Select Actions..."
              options={actionOptions}
              selected={actions}
              onChange={setActions}
              searchable />
            
          </div>

          <div>
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-44" />
            
          </div>

          <div>
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-44" />
            
          </div>

          <div className="ml-auto flex items-end gap-2">
            <MultiSelect
              variant="button"
              ariaLabel="Filter by actor"
              placeholder="Filter Actor"
              icon={<UserSearchIcon className="h-4 w-4 shrink-0 opacity-70" />}
              options={actorOptions}
              selected={actors}
              onChange={setActors}
              searchable
              className="w-[190px]"
              panelClassName="min-w-[280px]" />
            
            <Button onClick={exportVisible} disabled={visible.length === 0}>
              <DownloadIcon className="h-4 w-4" />
              Export CSV ({visible.length})
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
                    label={`Actor: ${a === ACTOR_SYSTEM ? 'System' : userName(a)}`}
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
            {visible.length} {visible.length === 1 ? 'entry' : 'entries'}
            {filterCount > 0 && ` of ${scoped.length}`}
          </p>
        </div>
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(l) => l.id}
          onRowClick={(l) => setSelected(l)}
          defaultSort={{ key: 'timestamp', dir: 'desc' }}
          empty={
          <EmptyState
            title="No matching entries"
            description="Try clearing a facet or widening the date range." />

          } />
        
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? actionLabel[selected.action] : ''}
        subtitle={
        selected ?
        `${categoryLabel[actionCategory[selected.action]]} · ${
        targetEntityLabel[selected.target_entity]} · ${
        selected.reference}` :
        ''
        }>
        {selected &&
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Actor</p>
                {userById(selected.actor_id) ?
              <p className="text-[13px] font-medium text-ink">
                    {userName(selected.actor_id)} —{' '}
                    {roleLabel[userById(selected.actor_id)!.role]}
                  </p> :

              <p className="inline-flex items-center gap-1.5 text-[13px] italic text-ink-muted">
                    <CogIcon className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                    System
                  </p>
              }
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">
                  Timestamp
                </p>
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
                centerName(selected.command_center_id) :
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
    </>);

}

function Chip({ label, onRemove }: {label: string;onRemove: () => void;}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
      exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.1, ease: [0.4, 0, 1, 1] } }}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas py-1 pl-2.5 pr-1.5 text-[12px] text-ink">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="rounded-full p-0.5 text-ink-faint transition-colors duration-150 ease-out hover:bg-ink/[0.08] hover:text-ink">
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
      <div className={cellStack}>
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
        {spacer}
      </div>);

  }

  return (
    <div className={cellStack}>
      <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink-faint">{title}</p>
      <div
        className={
        'rounded-md border px-3 py-2.5 ' + (
        tone === 'danger' ?
        'border-danger/25 bg-danger-soft/50' :
        'border-success/25 bg-success-soft/50')
        }>
        <dl className="space-y-2">
          {Object.entries(value).map(([k, v]) =>
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
          )}
        </dl>
      </div>
      {spacer}
    </div>);

}