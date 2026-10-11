import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatchData } from '../contexts/DispatchContext';

const shortcuts = [
  {
    to: '/incidents',
    label: 'Incident history',
    description: 'Review incident records, reports, and submitted evidence.'
  },
  {
    to: '/incidents',
    label: 'Civilian reports',
    description: 'Review reports submitted by members of the public.'
  },
  {
    to: '/personnel',
    label: 'Personnel',
    description: 'View staff and manage responder accounts.'
  },
  {
    to: '/audit',
    label: 'Audit logs',
    description: 'Review the recorded history of system activity.'
  }
];

export function Dashboard() {
  const { alerts, civilianReports, reports, userList } = useDispatchData();
  const activePersonnel = userList.filter((user) => user.account_status !== 'deactivated').length;

  const metrics = [
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
        className="grid gap-3 lg:grid-cols-12">
        <div className="flex min-h-36 flex-col justify-between rounded-lg border border-line border-l-4 border-l-primary bg-surface p-4 sm:p-5 lg:col-span-5">
          <p className="text-xs font-medium leading-snug text-ink-muted sm:text-sm">
            Incident records
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums text-ink sm:text-5xl">
            {alerts.length}
          </p>
          <p className="mt-2 text-xs text-ink-muted">Available for review</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:col-span-7">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="min-w-0 rounded-lg border border-line bg-surface p-3 sm:p-4">
              <p className="text-xs font-medium leading-snug text-ink-muted sm:text-sm">
                {metric.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-ink">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="dispatch-status-heading"
        className="rounded-lg border border-line bg-surface p-4 sm:p-5">
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
        {shortcuts.map(({ to, label, description }) => (
          <Link
            key={label}
            to={to}
            className="group flex min-h-24 min-w-0 items-start rounded-lg border border-line bg-surface p-3.5 transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:p-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold leading-snug text-ink group-hover:text-primary">
                {label}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
