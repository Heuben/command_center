import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { api } from '../lib/api';

type DashboardStats = {
  totalIncidents: number;
  totalActivePersonnel: number;
  totalGunIncidents: number;
  totalBladeIncidents: number;
  totalCollisionIncidents: number;
};

const shortcuts = [
  {
    to: '/incidents',
    label: 'Incident history',
    description: 'Review incident records, reports, and submitted evidence.'
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
  const { user, scopeCenterId, isSuperadmin } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        // If the user is a superadmin and has a scoped center (branchFilter not 'all'), we pass the scopeCenterId
        // Otherwise, we pass undefined to get overall stats (or we could pass the user's command_center_id if not superadmin)
        const data = await api.dashboardStats(scopeCenterId && !isSuperadmin ? scopeCenterId : undefined);
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user, scopeCenterId, isSuperadmin]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
        <p className="text-center py-12">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
        <p className="text-center text-danger">{error}</p>
      </div>
    );
  }

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

      {/* Stats Grid - Showing the 5 requested metrics */}
      <section aria-label="Record summary" className="grid gap-4 lg:grid-cols-5">
        {stats ? [
          {
            label: 'Incident records',
            value: stats.totalIncidents,
            description: 'Total incidents reported'
          },
          {
            label: 'Active personnel',
            value: stats.totalActivePersonnel,
            description: 'Currently active responders'
          },
          {
            label: 'Gun incidents',
            value: stats.totalGunIncidents,
            description: 'Incidents involving firearms'
          },
          {
            label: 'Blade incidents',
            value: stats.totalBladeIncidents,
            description: 'Incidents involving bladed weapons'
          },
          {
            label: 'Collision incidents',
            value: stats.totalCollisionIncidents,
            description: 'Vehicle collision incidents'
          }
        ].map((metric) => (
          <div
            key={metric.label}
            className="min-h-[80px] flex flex-col justify-between rounded-lg border border-line bg-surface p-4 sm:p-5"
          >
            <div>
              <p className="text-xs font-medium leading-snug text-ink-muted sm:text-sm">
                {metric.label}
              </p>
              {metric.description && (
                <p className="mt-1 text-xs text-ink-muted">
                  {metric.description}
                </p>
              )}
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
              {metric.value}
            </p>
          </div>
        )) : []}
      </section>

      <section
        aria-labelledby="dispatch-status-heading"
        className="rounded-lg border border-line bg-surface p-4 sm:p-5"
      >
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
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3"
      >
        {shortcuts.map(({ to, label, description }) => (
          <Link
            key={label}
            to={to}
            className="group flex min-h-24 min-w-0 items-start rounded-lg border border-line bg-surface p-3.5 transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:p-4"
          >
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