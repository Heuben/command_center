import React from 'react';
import {
  ClipboardCheckIcon,
  FileTextIcon,
  ScrollTextIcon,
  UsersIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatchData } from '../contexts/DispatchContext';

const shortcuts = [
  {
    to: '/incidents',
    label: 'Incident history',
    description: 'Review incident records, reports, and submitted evidence.',
    icon: ClipboardCheckIcon
  },
  {
    to: '/incidents',
    label: 'Civilian reports',
    description: 'Review reports submitted by members of the public.',
    icon: FileTextIcon
  },
  {
    to: '/personnel',
    label: 'Personnel',
    description: 'View staff and manage responder accounts.',
    icon: UsersIcon
  },
  {
    to: '/audit',
    label: 'Audit logs',
    description: 'Review the recorded history of system activity.',
    icon: ScrollTextIcon
  }
];

export function Dashboard() {
  const { alerts, civilianReports, reports, userList } = useDispatchData();
  const activePersonnel = userList.filter((user) => user.account_status !== 'deactivated').length;

  const metrics = [
    { label: 'Incident records', value: alerts.length },
    { label: 'Incident reports', value: reports.length },
    { label: 'Civilian reports', value: civilianReports.length },
    { label: 'Active personnel', value: activePersonnel }
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Command Center
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Review incident records, manage personnel, and check system activity.
        </p>
      </header>

      <section
        aria-label="Record summary"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="min-w-0 rounded-xl border border-line bg-surface p-3.5 shadow-card sm:p-4">
            <p className="text-xs font-medium leading-snug text-ink-muted sm:text-sm">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
              {metric.value}
            </p>
          </div>
        ))}
      </section>

      <section
        aria-labelledby="dispatch-status-heading"
        className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 id="dispatch-status-heading" className="text-sm font-semibold text-ink sm:text-base">
          Live dispatch is disabled
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-muted">
          The live queue, map, and responder assignment controls have been removed. Existing
          incident records and audit history remain available.
        </p>
      </section>

      <section
        aria-label="Dashboard shortcuts"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">
        {shortcuts.map(({ to, label, description, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="group flex min-h-24 min-w-0 items-start rounded-xl border border-line bg-surface p-3.5 shadow-card transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="shrink-0 rounded-lg bg-primary-soft p-2 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold leading-snug text-ink group-hover:text-primary">
                  {label}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
