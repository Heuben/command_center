import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDownIcon,
  EyeIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  StarIcon } from
'lucide-react';
import { twMerge } from 'tailwind-merge';
import type {
  Alert,
  AlertBranchResponse,
  AlertResponderAssignment,
  UserAccount } from
'../../types';
import { useSession } from '../../contexts/SessionContext';
import { useDispatchData } from '../../contexts/DispatchContext';
import { userById, userName, users } from '../../data/users';
import { centerById } from '../../data/commandCenters';
import {
  alertTypeLabel,
  assignmentStatusLabel,
  branchStatusLabel,
  confidenceDisplay,
  fullName,
  serviceProviderLabel } from
'../../utils/labels';
import { distanceKm, elapsedSince, formatClock, formatDistance } from '../../utils/time';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { EvidenceViewer } from '../ui/EvidenceViewer';

const SUGGESTED_COUNT = 3;

type Candidate = UserAccount & {km: number;};

export function DispatchPanel({
  alert,
  response



}: {alert: Alert;response: AlertBranchResponse;}) {
  const { user, now } = useSession();
  const { assignments, acknowledge, dispatchResponders, reassignResponder } = useDispatchData();
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [staged, setStaged] = useState<string[]>([]);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [reassignFor, setReassignFor] = useState<AlertResponderAssignment | null>(null);

  const driver = userById(alert.driver_id);
  const center = centerById(response.command_center_id);

  const branchAssignments = assignments.filter(
    (a) => a.alert_id === alert.id && a.command_center_id === response.command_center_id
  );
  const activeIds = useMemo(
    () =>
    new Set(
      branchAssignments.
      filter((a) => a.status !== 'declined' && a.status !== 'stood_down').
      map((a) => a.responder_id)
    ),
    [branchAssignments]
  );
  const allBranchResponders = useMemo(
    () =>
    users.filter(
      (u) =>
      u.role === 'responder' &&
      u.command_center_id === response.command_center_id &&
      u.account_status !== 'deactivated'
    ),
    [response.command_center_id]
  );

  /** Every on-duty responder at this branch is assignable — suggestions are only a shortcut. */
  const candidates = useMemo<Candidate[]>(
    () =>
    allBranchResponders.
    filter((u) => u.r_profile?.availability !== 'off_duty' && !activeIds.has(u.id)).
    map((u) => ({
      ...u,
      km: distanceKm(
        u.r_profile?.position ?? center?.location ?? alert.location,
        alert.location
      )
    })).
    sort((a, b) => a.km - b.km),
    [allBranchResponders, activeIds, center, alert.location]
  );

  /** Group units by name, counting total members vs on-duty assignable members. */
  const units = useMemo(() => {
    const map = new Map<string, {total: number;onDutyIds: string[];}>();
    for (const r of allBranchResponders) {
      const unit = r.r_profile?.unit;
      if (!unit) continue;
      const existing = map.get(unit) ?? { total: 0, onDutyIds: [] };
      existing.total += 1;
      if (r.r_profile?.availability !== 'off_duty' && !activeIds.has(r.id)) {
        existing.onDutyIds.push(r.id);
      }
      map.set(unit, existing);
    }
    return Array.from(map.entries()).
    map(([name, data]) => ({ name, ...data })).
    filter((u) => u.onDutyIds.length > 0).
    sort((a, b) => a.name.localeCompare(b.name));
  }, [allBranchResponders, activeIds]);

  const preDispatch = response.status === 'pending' || response.status === 'viewing';
  const canAct = response.status !== 'resolved';

  useEffect(() => {
    const defaults = candidates.slice(0, 2).map((r) => r.id);
    setStaged(preDispatch ? defaults : []);
    setLeadId(preDispatch ? defaults[0] ?? null : null);
    setReassignFor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.id, response.command_center_id]);

  const suggestions = candidates.slice(0, SUGGESTED_COUNT);
  const stagedExtras = candidates.filter(
    (c) => staged.includes(c.id) && !suggestions.some((s) => s.id === c.id)
  );
  const stagingRows = [...suggestions, ...stagedExtras];

  const toggleStaged = (id: string) => {
    setStaged((prev) => {
      const next = prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id];
      if (!next.includes(leadId ?? '')) setLeadId(next[0] ?? null);
      return next;
    });
  };

  const toggleUnit = (unitIds: string[]) => {
    setStaged((prev) => {
      const allPresent = unitIds.every((id) => prev.includes(id));
      const next = allPresent ?
      prev.filter((id) => !unitIds.includes(id)) :
      Array.from(new Set([...prev, ...unitIds]));
      if (!next.includes(leadId ?? '')) setLeadId(next[0] ?? null);
      return next;
    });
  };

  const orderDispatch = () => {
    if (!user || staged.length === 0) return;
    dispatchResponders(alert.id, response.command_center_id, staged, user.id, leadId);
    setStaged([]);
    setLeadId(null);
  };

  const assignNow = (responderId: string) => {
    if (!user) return;
    dispatchResponders(alert.id, response.command_center_id, [responderId], user.id, null);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-none bg-canvas">
      {/* Alert header */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-danger">
            {alertTypeLabel[alert.alert_type]}
          </h2>
          <span className="text-lg font-semibold tabular-nums text-ink">
            {elapsedSince(response.triggered_at, now)}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-ink-muted">
          Alert #{alert.id.replace('a-', '')} <span className="text-ink-faint">|</span>{' '}
          {alert.address}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Badge
            tone={
            response.status === 'pending' ?
            'urgent' :
            response.status === 'resolved' ?
            'success' :
            'primary'
            }
            variant={response.status === 'pending' ? 'solid' : 'soft'}
            className="uppercase tracking-wide">
            {response.status === 'pending' ?
            'Pending Dispatch' :
            branchStatusLabel[response.status]}
          </Badge>
          {response.status === 'pending' && user &&
          <button
            onClick={() => acknowledge(alert.id, response.command_center_id, user.id)}
            className="text-[13px] font-medium text-primary transition-colors duration-150 ease-out hover:underline">
              Acknowledge
            </button>
          }
        </div>
      </header>

      {/* Pre-dispatch: staging area */}
      {preDispatch &&
      <section className="p-4" aria-label="Responder dispatch staging">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
            Responder Dispatch Staging
          </h3>

          {units.length > 0 &&
        <div className="mb-3 flex flex-col gap-3 rounded-lg border border-line bg-surface p-3 shadow-card">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-semibold text-ink">Dispatch by Unit</p>
                <p className="text-[12px] text-ink-faint">
                  {units.length} {units.length === 1 ? 'unit' : 'units'} available
                </p>
              </div>
              <ul className="flex flex-col gap-1">
                {units.map((u) => {
              const allStaged = u.onDutyIds.every((id) => staged.includes(id));
              return (
                <li
                  key={u.name}
                  className={twMerge(
                    'flex items-center justify-between gap-3 rounded p-2 transition-colors duration-150 ease-out',
                    allStaged ? 'bg-primary-soft' : 'hover:bg-ink/[0.03]'
                  )}>
                      <div className="min-w-0">
                        <p
                      className={twMerge(
                        'truncate text-[13px] font-medium',
                        allStaged ? 'text-ink' : 'text-ink-muted'
                      )}>
                          {u.name}
                        </p>
                        <p
                      className={twMerge(
                        'text-[12px] tabular-nums',
                        allStaged ? 'text-ink-muted' : 'text-ink-faint'
                      )}>
                          {u.onDutyIds.length} of {u.total} on duty
                        </p>
                      </div>
                      <button
                    type="button"
                    onClick={() => toggleUnit(u.onDutyIds)}
                    className={twMerge(
                      'shrink-0 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 ease-out',
                      allStaged ?
                      'border-primary bg-primary text-white hover:bg-primary/90' :
                      'border-line bg-surface text-ink hover:bg-ink/[0.04]'
                    )}>
                        {allStaged ? 'Added' : 'Add Unit'}
                      </button>
                    </li>);

            })}
              </ul>
            </div>
        }

          <div className="flex flex-col gap-3 rounded-lg border-2 border-primary/60 bg-surface p-3 shadow-card">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-ink">Nearest Available</p>
              <p className="text-[12px] text-ink-faint">
                {suggestions.length} suggested · {candidates.length} on duty
              </p>
            </div>

            <ul className="flex flex-col gap-1">
              {stagingRows.map((r) => {
              const checked = staged.includes(r.id);
              const isLead = leadId === r.id && checked;
              return (
                <li
                  key={r.id}
                  className={twMerge(
                    'flex items-center gap-3 rounded p-2 transition-colors duration-150 ease-out',
                    checked ? 'bg-primary-soft' : 'hover:bg-ink/[0.03]'
                  )}>
                    <input
                    type="checkbox"
                    id={`stage-${r.id}`}
                    checked={checked}
                    onChange={() => toggleStaged(r.id)}
                    className="h-4 w-4 shrink-0 rounded border-line accent-[rgb(var(--primary))]" />
                  

                    <label
                    htmlFor={`stage-${r.id}`}
                    className="min-w-0 flex-1 cursor-pointer select-none">
                      <span
                      className={twMerge(
                        'block truncate text-[13px] font-medium',
                        checked ? 'text-ink' : 'text-ink-faint'
                      )}>
                        {fullName(r)}{' '}
                        <span className="font-normal">({r.r_profile?.call_sign})</span>
                      </span>
                      <span
                      className={twMerge(
                        'block text-[12px] tabular-nums',
                        checked ? 'text-ink-muted' : 'text-ink-faint'
                      )}>
                        {formatDistance(r.km)}
                        {isLead && ' · Lead / Reporter'}
                      </span>
                    </label>
                    <button
                    type="button"
                    onClick={() => {
                      if (!checked) toggleStaged(r.id);
                      setLeadId(r.id);
                    }}
                    title="Lead / Reporter Assigned"
                    aria-label={`Assign ${fullName(r)} as lead and reporter`}
                    aria-pressed={isLead}
                    className="shrink-0 rounded p-1 transition-colors duration-150 ease-out hover:bg-ink/[0.06]">
                      <StarIcon
                      className={twMerge(
                        'h-4 w-4',
                        isLead ? 'fill-primary text-primary' : 'text-ink-faint'
                      )} />
                    
                    </button>
                  </li>);

            })}
              {candidates.length === 0 &&
            <li className="px-1 py-2 text-[13px] text-ink-muted">
                  No on-duty responders available at this branch.
                </li>
            }
            </ul>
          </div>

          <ResponderSearch
          candidates={candidates.filter((c) => !staged.includes(c.id))}
          placeholder="Search and add any responder to this dispatch…"
          actionLabel="Add"
          onPick={(id) => toggleStaged(id)} />
        

          <button
          onClick={orderDispatch}
          disabled={staged.length === 0}
          className="mt-4 w-full rounded-lg bg-primary py-3 text-center text-sm font-semibold text-white shadow-md transition-colors duration-150 ease-out hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45">
            Order Dispatch ({staged.length} {staged.length === 1 ? 'Responder' : 'Responders'})
          </button>
        </section>
      }

      {/* Post-dispatch: active roster */}
      {!preDispatch && branchAssignments.length > 0 &&
      <section className="p-4" aria-label="Dispatched personnel">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
            Dispatched Personnel ({branchAssignments.length})
          </h3>

          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {branchAssignments.map((a) => {
            const responder = userById(a.responder_id);
            const declined = a.status === 'declined';
            return (
              <li key={a.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-ink">
                        <span className="truncate">{userName(a.responder_id)}</span>
                        <span className="font-normal text-ink-muted">
                          ({responder?.r_profile?.call_sign})
                        </span>
                        {a.is_lead &&
                      <span className="inline-flex items-center gap-1 rounded bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                            <StarIcon className="h-3 w-3 fill-primary" />
                            Lead / Reporter
                          </span>
                      }
                      </p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-ink-faint">
                        {a.dispatch_origin === 'self_dispatched' ?
                      'Self-dispatched' :
                      `Dispatched by ${userName(a.assigned_by)}`}{' '}
                        · {formatClock(a.assigned_at)}
                        {a.arrived_at && ` · Arrived ${formatClock(a.arrived_at)}`}
                      </p>
                    </div>
                    <span
                    className={twMerge(
                      'shrink-0 text-sm font-semibold',
                      a.status === 'en_route' && 'text-success',
                      a.status === 'arrived' && 'text-primary',
                      a.status === 'assigned' && 'text-ink-muted',
                      declined && 'text-danger',
                      a.status === 'stood_down' && 'text-ink-faint'
                    )}>
                      {assignmentStatusLabel[a.status]}
                    </span>
                  </div>

                  {declined &&
                <div className="mt-2">
                      <p className="text-xs italic text-danger">
                        “{a.decline_reason}”
                        {a.declined_at &&
                    <span className="not-italic text-ink-faint">
                            {' '}
                            · {formatClock(a.declined_at)}
                          </span>
                    }
                      </p>
                      {a.replaced_by ?
                  <p className="mt-1.5 text-[12px] text-ink-muted">
                          Replaced by {userName(a.replaced_by)}.
                        </p> :

                  canAct &&
                  <button
                    onClick={() => setReassignFor(a)}
                    className="mt-2 rounded border border-line px-2 py-1 text-xs text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.04]">
                            Reassign Responder
                          </button>

                  }
                    </div>
                }
                </li>);

          })}
          </ul>

          {canAct &&
        <ResponderSearch
          candidates={candidates}
          placeholder="Search and assign additional responders…"
          actionLabel="Assign"
          onPick={assignNow} />

        }
        </section>
      }

      {/* Evidence and metadata */}
      <div className="space-y-4 p-4 pt-0">
        <Section title="Scene Evidence" defaultOpen>
          <button
            onClick={() => setEvidenceOpen(true)}
            className="group relative block w-full overflow-hidden rounded-md border border-line">
            <img
              src={alert.snapshot_urls[0]}
              alt={`Auto-captured device snapshot for alert ${alert.id.replace('a-', '')}`}
              className="h-32 w-full object-cover" />
            

            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/35 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100">
              <span className="inline-flex items-center gap-1.5 rounded bg-white/95 px-2.5 py-1 text-[12px] font-medium text-slate-900">
                <EyeIcon className="h-3.5 w-3.5" /> View Evidence
              </span>
            </span>
          </button>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="dot" tone="neutral">
              {alert.source === 'edge_imu' ? 'IMU Collision Trigger' : 'On-device Vision Model'}
            </Badge>
            <Badge variant="dot" tone="neutral">
              Confidence {confidenceDisplay(alert.confidence_level)}
            </Badge>
          </div>
        </Section>

        {driver?.d_profile &&
        <>
            <Section title="Victim Details" defaultOpen>
              <dl className="space-y-2 text-[12px]">
                <Row label="Driver" value={fullName(driver)} />
                <Row
                label="Phone"
                value={driver.m_number ?? '—'}
                href={`tel:${driver.m_number}`} />
              
                <Row label="Medical" value={`Blood Type ${driver.d_profile.blood_type}`} />
                <Row label="Plate" value={driver.d_profile.plate_number} />
                <Row
                label="Provider"
                value={serviceProviderLabel[driver.d_profile.service_provider]} />
              
              </dl>
            </Section>

            <Section title="Emergency Contacts" defaultOpen>
              <ul className="space-y-2">
                {driver.d_profile.emergency_contacts.map((c) =>
              <li key={c.phone} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-[12px]">
                      <span className="block truncate font-medium text-ink">{c.name}</span>
                      <span className="text-ink-muted">{c.relationship}</span>
                    </span>
                    <a
                  href={`tel:${c.phone}`}
                  className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium tabular-nums text-primary hover:underline">
                      <PhoneIcon className="h-3.5 w-3.5" />
                      {c.phone}
                    </a>
                  </li>
              )}
              </ul>
            </Section>
          </>
        }

        <p className="flex items-start gap-1.5 px-1 text-[12px] text-ink-faint">
          <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)} · {center?.name}
        </p>
      </div>

      {/* Reassign a responder who declined */}
      <Modal
        open={!!reassignFor}
        onClose={() => setReassignFor(null)}
        title="Reassign Responder"
        subtitle={
        reassignFor ?
        `${userName(reassignFor.responder_id)} declined: “${reassignFor.decline_reason}”` :
        ''
        }>
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {candidates.map((c) =>
          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">
                  {fullName(c)}{' '}
                  <span className="font-normal text-ink-muted">({c.r_profile?.call_sign})</span>
                </p>
                <p className="text-[12px] tabular-nums text-ink-muted">
                  {formatDistance(c.km)} from scene
                </p>
              </div>
              <button
              onClick={() => {
                if (user && reassignFor) {
                  reassignResponder(reassignFor.id, c.id, user.id);
                  setReassignFor(null);
                }
              }}
              className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-white transition-colors duration-150 ease-out hover:bg-primary/90">
                Assign
              </button>
            </li>
          )}
          {candidates.length === 0 &&
          <li className="px-3 py-6 text-center text-[13px] text-ink-muted">
              No other on-duty responders are available at this branch.
            </li>
          }
        </ul>
      </Modal>

      <EvidenceViewer alert={alert} open={evidenceOpen} onClose={() => setEvidenceOpen(false)} />
    </div>);

}

/** Free-text search over every assignable responder — assignment is never capped. */
function ResponderSearch({
  candidates,
  placeholder,
  actionLabel,
  onPick





}: {candidates: Candidate[];placeholder: string;actionLabel: string;onPick: (id: string) => void;}) {
  const [query, setQuery] = useState('');
  const matches = query ?
  candidates.filter((c) =>
  `${fullName(c)} ${c.r_profile?.call_sign ?? ''}`.
  toLowerCase().
  includes(query.toLowerCase())
  ) :
  candidates;

  return (
    <div className="relative mt-3">
      <SearchIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" />
      

      {query.length > 0 &&
      <ul className="mt-1.5 max-h-56 divide-y divide-line overflow-y-auto scrollbar-none rounded-lg border border-line bg-surface shadow-card">
          {matches.map((c) =>
        <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">
                  {fullName(c)}{' '}
                  <span className="font-normal text-ink-muted">({c.r_profile?.call_sign})</span>
                </p>
                <p className="text-[12px] tabular-nums text-ink-muted">
                  {formatDistance(c.km)} from scene
                </p>
              </div>
              <button
            onClick={() => {
              onPick(c.id);
              setQuery('');
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-[12px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.04]">
                <PlusIcon className="h-3.5 w-3.5" />
                {actionLabel}
              </button>
            </li>
        )}
          {matches.length === 0 &&
        <li className="px-3 py-4 text-center text-[13px] text-ink-muted">
              No matching responder on duty.
            </li>
        }
        </ul>
      }
    </div>);

}

function Section({
  title,
  defaultOpen,
  children




}: {title: string;defaultOpen?: boolean;children: React.ReactNode;}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{title}</h3>
        <ChevronDownIcon
          className={twMerge(
            'h-4 w-4 text-ink-faint transition-transform duration-150 ease-out',
            open && 'rotate-180'
          )} />
        
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>);

}

function Row({ label, value, href }: {label: string;value: string;href?: string;}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate font-medium text-ink">
        {href ?
        <a href={href} className="tabular-nums text-primary hover:underline">
            {value}
          </a> :

        value
        }
      </dd>
    </div>);

}