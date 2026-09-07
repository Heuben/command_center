import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { Alert, AlertBranchResponse, BranchResponseStatus } from '../../types';
import { alertTypeLabel, alertTypeShort, branchStatusLabel } from '../../utils/labels';
import { distanceKm, elapsedSince, formatDistance } from '../../utils/time';
import { centerById, centerName } from '../../data/commandCenters';
import { fadeUp } from '../../lib/motion';

export type QueueRow = {
  response: AlertBranchResponse;
  alert: Alert;
};

const ORDER: BranchResponseStatus[] = ['pending', 'viewing', 'dispatched', 'arrived', 'resolved'];

/** Live work stays open; historical states collapse to protect vertical space. */
const DEFAULT_EXPANDED: Record<BranchResponseStatus, boolean> = {
  pending: true,
  viewing: false,
  dispatched: true,
  arrived: false,
  resolved: false
};

const groupAccent: Record<BranchResponseStatus, string> = {
  pending: 'bg-urgent',
  viewing: 'bg-ink-faint',
  dispatched: 'bg-primary',
  arrived: 'bg-primary',
  resolved: 'bg-success'
};

export function EmergencyQueue({
  rows,
  selectedKey,
  onSelect,
  now,
  showBranch






}: {rows: QueueRow[];selectedKey: string | null;onSelect: (row: QueueRow) => void;now: number;showBranch: boolean;}) {
  const [expanded, setExpanded] =
  useState<Record<BranchResponseStatus, boolean>>(DEFAULT_EXPANDED);

  return (
    <div className="flex h-full flex-col">
      {ORDER.map((status) => {
        const group = rows.filter((r) => r.response.status === status);
        const isOpen = expanded[status];
        return (
          <section key={status} className="border-b border-line last:border-0">
            <h3>
              <button
                onClick={() => setExpanded((prev) => ({ ...prev, [status]: !prev[status] }))}
                aria-expanded={isOpen}
                className="sticky top-0 z-10 flex w-full items-center gap-2 bg-surface/95 px-4 py-2.5 text-left backdrop-blur transition-colors duration-150 ease-out hover:bg-ink/[0.04]">
                <ChevronDownIcon
                  className={twMerge(
                    'h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 ease-out',
                    !isOpen && '-rotate-90'
                  )} />
                

                <span
                  className={twMerge('h-1.5 w-1.5 shrink-0 rounded-full', groupAccent[status])} />
                
                <span className="flex-1 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                  {branchStatusLabel[status]}
                </span>
                <span
                  className={twMerge(
                    'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                    status === 'pending' && group.length > 0 ?
                    'bg-urgent text-white' :
                    'bg-ink/[0.07] text-ink-muted'
                  )}>
                  {group.length}
                </span>
              </button>
            </h3>

            {isOpen &&
            <ul>
                {group.map((row, i) => {
                const key = `${row.alert.id}:${row.response.command_center_id}`;
                const active = key === selectedKey;
                const center = centerById(row.response.command_center_id);
                const dist = center ?
                formatDistance(distanceKm(center.location, row.alert.location)) :
                '—';
                const urgent = status === 'pending';
                return (
                  <motion.li
                    key={key}
                    initial="hidden"
                    animate="show"
                    variants={fadeUp}
                    custom={i}
                    className="overflow-hidden">
                      <button
                      onClick={() => onSelect(row)}
                      aria-current={active ? 'true' : undefined}
                      className={twMerge(
                        'w-full border-l-2 px-4 py-3 text-left transition-colors duration-150 ease-out',
                        active ?
                        'border-l-primary bg-primary-soft' :
                        'border-l-transparent hover:bg-ink/[0.04]'
                      )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                            className={twMerge(
                              'truncate text-[13px] font-semibold',
                              urgent ? 'text-danger' : 'text-ink'
                            )}>
                              {alertTypeLabel[row.alert.alert_type]}
                            </p>
                            <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                              {row.alert.address}
                            </p>
                          </div>
                          <span
                          className={twMerge(
                            'shrink-0 rounded px-1.5 py-0.5 text-[12px] font-semibold tabular-nums',
                            urgent ? 'bg-urgent text-white' : 'bg-ink/[0.06] text-ink-muted'
                          )}>
                            {elapsedSince(row.response.triggered_at, now)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-faint">
                          <span className="font-medium text-ink-muted">
                            {alertTypeShort[row.alert.alert_type]}
                          </span>
                          <span aria-hidden>·</span>
                          <span>{dist} from station</span>
                          {showBranch &&
                        <>
                              <span aria-hidden>·</span>
                              <span className="truncate">
                                {centerName(row.response.command_center_id)}
                              </span>
                            </>
                        }
                        </div>
                      </button>
                    </motion.li>);

              })}
                {group.length === 0 &&
              <li className="px-4 py-3 text-[12px] text-ink-faint">
                    No alerts in this state.
                  </li>
              }
              </ul>
            }
          </section>);

      })}
    </div>);

}