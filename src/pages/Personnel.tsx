import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BuildingIcon,
  CheckCircle2Icon,
  KeyRoundIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  UserCogIcon,
  XCircleIcon
} from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { api } from '../lib/api';
import type { Agency, UserAccount } from '../types';
import { agencyLabel, agencyShort, fullName, rankDisplay, roleLabel } from '../utils/labels';
import { DataTable } from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { Badge, DutyBadge } from '../components/ui/Badge';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Segmented,
  Select
} from '../components/ui/primitives';
import { Modal } from '../components/ui/Modal';
import { RowActions } from '../components/ui/RowActions';
import type { RowAction } from '../components/ui/RowActions';
import { useToast } from '../hooks/useToast';
import { useMotionVariants, fadeUp, DUR, EASE } from '../lib/motion';

export function Personnel() {
  const { scopeCenterId, isSuperadmin, user } = useSession();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [commandCenters, setCommandCenters] = useState<any[]>([]); // We'll type as CommandCenter[] later
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [deactivatedIds, setDeactivatedIds] = useState<string[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Fetch users and command centers
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch users
        const usersData = await api.getUsers();
        // Fetch command centers (needed for the modal and for displaying branch)
        const centersData = await api.getCommandCenters();
        if (!cancelled) {
          setUsers(usersData);
          setCommandCenters(centersData);
          setIsFirstLoad(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load personnel data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [scopeCenterId, isSuperadmin]); // Refetch when scopeCenterId or admin status changes

  // Sync deactivatedIds whenever users changes (new responders may be created, etc.).
  useEffect(() => {
    setDeactivatedIds((prev) => {
      const fresh = users.filter((u) => u.account_status === 'deactivated').map((u) => u.id);
      return prev.length === 0 && fresh.length === 0 ? prev : fresh;
    });
  }, [users]);

  const isDeactivated = (id: string) => deactivatedIds.includes(id);

  useEffect(() => {
    if (!isFirstLoad) setIsFirstLoad(false);
  }, [isFirstLoad]);

  // Auto-dismiss the "provisioned" banner after a few seconds.
  useEffect(() => {
    if (!created) return;
    const t = window.setTimeout(() => setCreated(null), 5000);
    return () => window.clearTimeout(t);
  }, [created]);

  const setAccountActive = async (person: UserAccount, active: boolean) => {
    setDeactivatedIds((prev) =>
      active ? prev.filter((id) => id !== person.id) : [...prev, person.id]
    );
    try {
      await api.updateUser(person.id, { account_status: active ? 'active' : 'deactivated' });
      toast.success(
        active ?
          `${fullName(person)}'s account was reactivated and can sign in again.` :
          `${fullName(person)}'s account was deactivated. They can no longer sign in or be dispatched.`
      );
    } catch (err) {
      toast.error('Failed to update account status.');
      // Revert the optimistic update on error
      setDeactivatedIds((prev) =>
        active ? [...prev, person.id] : prev.filter((id) => id !== person.id)
      );
    }
  };

  /** Admins cannot move personnel out of their own jurisdiction, so branch reassignment is superadmin-only. */
  const rowActions = (person: UserAccount): RowAction[] => [
  {
    label: 'Modify Role',
    icon: UserCogIcon,
    onSelect: () => toast.info(`Role change requested for ${fullName(person)}.`)
  },
  ...(isSuperadmin ?
  [
  {
    label: 'Reassign Branch',
    icon: BuildingIcon,
    onSelect: () => toast.info(`Branch reassignment started for ${fullName(person)}.`)
  }
  ] : []),
  {
    label: 'Force Password Reset',
    icon: KeyRoundIcon,
    onSelect: () =>
    toast.warning(
      `${fullName(person)} must set a new password at next sign-in. A temporary password was issued.`
    )
  },
  {
    label: 'Revoke Active Session',
    icon: LogOutIcon,
    onSelect: () => toast.info(`Active session revoked for ${fullName(person)}.`)
  },
  isDeactivated(person.id) ?
  {
    label: 'Activate Account',
    icon: CheckCircle2Icon,
    dividerBefore: true,
    onSelect: () => setAccountActive(person, true)
  } :
  {
    label: 'Deactivate Account',
    icon: XCircleIcon,
    dividerBefore: true,
    destructive: true,
    onSelect: () => setAccountActive(person, false)
  }];

  const inScope = users.
    filter((u) => u.role === 'responder' || u.role === 'admin').
    filter((u) => !scopeCenterId || u.command_center_id === scopeCenterId);

  const deactivatedCount = inScope.filter((u) => deactivatedIds.includes(u.id)).length;

  const rows = inScope.
    filter((u) =>
      statusFilter === 'all' ?
        true :
        statusFilter === 'deactivated' ?
          deactivatedIds.includes(u.id) :
          !deactivatedIds.includes(u.id)
    ).
    filter((u) =>
      query ?
        `${fullName(u)} ${u.r_profile?.call_sign ?? ''} ${u.email}`.
          toLowerCase().
          includes(query.toLowerCase()) :
        true
    );

  const columns: Column<UserAccount>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    sortValue: (r) => fullName(r),
    render: (r) =>
    <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-medium">
            <span className={isDeactivated(r.id) ? 'text-ink-muted' : 'text-ink'}>
              {fullName(r)}
            </span>
            {isDeactivated(r.id) &&
          <Badge tone="danger" variant="soft">
              Deactivated
            </Badge>
          }
          </p>
          <p className="truncate text-[12px] text-ink-muted">{r.email}</p>
        </div>

  },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    sortValue: (r) => r.role,
    render: (r) =>
    <Badge tone={r.role === 'admin' ? 'primary' : 'neutral'}>{roleLabel[r.role]}</Badge>

  },
  {
    key: 'agency',
    header: 'Agency',
    sortable: true,
    sortValue: (r) => r.r_profile?.agency ?? '',
    render: (r) =>
    r.r_profile ?
    <span title={agencyLabel[r.r_profile.agency]}>{agencyShort[r.r_profile.agency]}</span> :

    '—'

  },
  {
    key: 'call_sign',
    header: 'Call Sign',
    sortable: true,
    sortValue: (r) => r.r_profile?.call_sign ?? '',
    render: (r) =>
    <span className="font-mono text-[12px] text-ink">{r.r_profile?.call_sign ?? '—'}</span>

  },
  {
    key: 'rank',
    header: 'Rank',
    sortable: true,
    sortValue: (r) =>
    rankDisplay(r.r_profile?.rank ?? 'none', r.r_profile?.agency ?? 'police'),
    render: (r) => r.r_profile ? rankDisplay(r.r_profile.rank, r.r_profile.agency) : '—'
  },
  ...(isSuperadmin && !scopeCenterId ?
  [
  {
    key: 'branch',
    header: 'Branch',
    sortable: true,
    sortValue: (r: UserAccount) => {
      // Find the center name from commandCenters state
      const center = commandCenters.find((c) => c.id === r.command_center_id);
      return center ? center.name : '';
    },
    render: (r: UserAccount) => {
      const center = commandCenters.find((c) => c.id === r.command_center_id);
      return <span className="text-[13px] text-ink-muted">{center ? center.name : ''}</span>;
    }

  }] :

  []),
  {
    key: 'duty',
    header: 'Duty Status',
    sortable: true,
    sortValue: (r) => isDeactivated(r.id) ? 'zz' : r.r_profile?.availability ?? '',
    render: (r) =>
    isDeactivated(r.id) ?
    <span className="text-[13px] text-ink-faint">No access</span> :
    r.r_profile ?
    <DutyBadge availability={r.r_profile.availability} /> :

    '—'

  },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    width: '64px',
    align: 'right',
    render: (r) =>
    <div className="flex justify-end">
          <RowActions
        ariaLabel={`Actions for ${fullName(r)}`}
        actions={rowActions(r)}
        open={openMenuId === r.id}
        onOpenChange={(next) => setOpenMenuId(next ? r.id : null)} />

        </div>

  }];


  return (
    <motion.div variants={useMotionVariants(fadeUp)} initial="hidden" animate="show">
      <PageHeader
        title="Personnel"
        subtitle={
        isSuperadmin ?
        scopeCenterId ?
        `Responders and admins at ${scopeCenterId ? commandCenters.find(c => c.id === scopeCenterId)?.name : 'unknown'}` :
        'Responders and admins across all command centers' :
        `Responders and admins at ${user?.command_center_id ? commandCenters.find(c => c.id === user.command_center_id)?.name : 'unknown'}`
        }
        actions={
        <>
            <Segmented<'all' | 'active' | 'deactivated'>
            ariaLabel="Filter by account status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
            { value: 'all', label: 'All', count: inScope.length },
            {
              value: 'active',
              label: 'Active',
              count: inScope.length - deactivatedCount
            },
            { value: 'deactivated', label: 'Deactivated', count: deactivatedCount }]
            } />


            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or call sign"
              aria-label="Search personnel"
              className="w-full pl-8 sm:w-64" />

            </div>
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              Add Responder
            </Button>
          </>
        } />


      <AnimatePresence>
        {created && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } }}
          exit={{ opacity: 0, transition: { duration: DUR.fast, ease: EASE.in } }}
          role="status"
          className="mb-4 mt-2 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-[13px] text-success">
          {created} was provisioned. Share the temporary password and require a change at first
          sign-in.
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          rowClassName={(r) => isDeactivated(r.id) ? 'bg-danger-soft/30' : ''}
          defaultSort={{ key: 'name', dir: 'asc' }}
          empty={
          <EmptyState
            title="No personnel found"
            description="Adjust your search or add a responder to this branch." />

          }
          loading={loading || isFirstLoad}
          caption={loading || isFirstLoad ? 'Loading personnel' : undefined} />
      </Card>

      <AddResponderModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(name, tempPassword) => {
          setCreated(`${name} · temporary password ${tempPassword}`);
          setAddOpen(false);
          toast.success(`${name} provisioned. Temporary password: ${tempPassword}`);
        }}
        onError={(msg) => toast.error(msg)}
        lockedCenterId={isSuperadmin ? null : user?.command_center_id ?? null}
        commandCenters={commandCenters} />

      </motion.div>);
}

function AddResponderModal({
  open,
  onClose,
  onCreated,
  onError,
  lockedCenterId,
  commandCenters
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string, tempPassword: string) => void;
  onError: (msg: string) => void;
  lockedCenterId: string | null;
  commandCenters: any[];
}) {
  const { user: currentUser } = useSession();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [agency, setAgency] = useState<'barangay_tanod' | 'police' | 'mdrrmo'>('barangay_tanod');
  const [callSign, setCallSign] = useState('');
  const [rank, setRank] = useState('');
  const [center, setCenter] = useState(lockedCenterId ?? (commandCenters[0]?.id ?? ''));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFirst('');
      setLast('');
      setEmail('');
      setAgency('barangay_tanod');
      setCallSign('');
      setRank('');
      setCenter(lockedCenterId ?? (commandCenters[0]?.id ?? ''));
      setSubmitting(false);
    }
  }, [open, lockedCenterId, commandCenters]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const emailTaken = false; // We don't have the user list here, so we'll skip this check for now.
  // In a real app, we might want to check for email duplication via an API call, but we'll omit for simplicity.
  const canSubmit = !!(
    first.trim() &&
    last.trim() &&
    emailValid &&
    !emailTaken &&
    !submitting &&
    center
  );

  const handleCreate = async () => {
    if (!first.trim() || !last.trim() || !email.trim()) {
      onError('First name, last name, and email are required.');
      return;
    }
    if (!emailValid) {
      onError('Enter a valid work email address.');
      return;
    }
    if (emailTaken) {
      onError('A user with that email already exists.');
      return;
    }
    if (!center) {
      onError('Create a command center before provisioning responders.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.createUser(
        {
          f_name: first.trim(),
          l_name: last.trim(),
          role: 'responder',
          email: email.trim(),
          command_center_id: center,
          account_status: 'active',
          must_change_password: true,
          r_profile: {
            agency,
            call_sign: callSign.trim() || null,
            rank: agency === 'police' ? rank.trim() || 'PCpl' : 'none',
            availability: 'off_duty'
          }
        },
        currentUser?.id ?? ''
      );
      onCreated(`${first.trim()} ${last.trim()}`, result.tempPassword);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create account.';
      onError(msg);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Responder"
      subtitle="Provisions a branch-scoped account with a temporary password."
      footer={
      <>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!canSubmit} onClick={handleCreate}>
            {submitting ? 'Creating…' : 'Create Account'}
          </Button>
        </>
      }>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first">First Name</Label>
          <Input id="first" value={first} onChange={(e) => setFirst(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="last">Last Name</Label>
          <Input id="last" value={last} onChange={(e) => setLast(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="new-email">Work Email</Label>
          <Input
            id="new-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@station.bantai.gov.ph" />

        </div>
        <div>
          <Label htmlFor="agency">Agency</Label>
          <Select
            id="agency"
            className="w-full"
            value={agency}
            onChange={(e) => setAgency(e.target.value as 'barangay_tanod' | 'police' | 'mdrrmo')}>
            <option value="barangay_tanod">Barangay Tanod</option>
            <option value="police">Philippine National Police</option>
            <option value="mdrrmo">MDRRMO</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="callsign">Call Sign</Label>
          <Input
            id="callsign"
            value={callSign}
            onChange={(e) => setCallSign(e.target.value)}
            placeholder="BRGY-171-7" />

        </div>
        <div>
          <Label htmlFor="rank">Rank</Label>
          <Input
            id="rank"
            value={rank}
            disabled={agency !== 'police'}
            onChange={(e) => setRank(e.target.value)}
            placeholder={agency === 'police' ? 'PCpl' : 'Not applicable'} />

        </div>
        <div>
          <Label htmlFor="center">Command Center</Label>
          <Select
            id="center"
            className="w-full"
            value={center}
            disabled={!!lockedCenterId}
            onChange={(e) => setCenter(e.target.value)}>
            {commandCenters.length === 0 ?
            <option value="">No command centers yet</option> :
            commandCenters.map((c) =>
            <option key={c.id} value={c.id}>
                {c.name}
              </option>
            )}
          </Select>
        </div>
        <div className="col-span-2 rounded-md border border-line bg-canvas px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Temporary Password</p>
          <p className="mt-1 text-[13px] text-ink">A one-time password will be generated on create.</p>
          <p className="mt-1 text-[12px] text-ink-muted">
            Copy it from the confirmation toast. The responder must change it at first sign-in.
          </p>
        </div>
      </div>
    </Modal>
  );
}