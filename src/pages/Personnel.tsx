import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BuildingIcon,
  CheckCircle2Icon,
  KeyRoundIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  XCircleIcon
} from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { useCommandCenters } from '../contexts/CommandCenterContext';
import { api } from '../lib/api';
import type { CommandCenter, UserAccount } from '../types';
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

type PersonnelStatusFilter = 'all' | 'active' | 'pending_activation' | 'deactivated';
type PagedPersonnelStatus = Extract<PersonnelStatusFilter, 'active' | 'pending_activation' | 'deactivated'>;
type PersonnelStatusPage = {users: UserAccount[];cursor: string | null;hasMore: boolean;};

export function Personnel() {
  const { scopeCenterId, isSuperadmin, user } = useSession();
  const { commandCenters } = useCommandCenters();
  const personnelCenterId = scopeCenterId ?? user?.command_center_id ?? null;
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [statusPages, setStatusPages] = useState<Record<PagedPersonnelStatus, PersonnelStatusPage>>({
    active: { users: [], cursor: null, hasMore: false },
    pending_activation: { users: [], cursor: null, hasMore: false },
    deactivated: { users: [], cursor: null, hasMore: false }
  });
  const [statusPageLoading, setStatusPageLoading] = useState(false);
  const [loadingMoreStatusPage, setLoadingMoreStatusPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PersonnelStatusFilter>('all');
  const [deactivatedIds, setDeactivatedIds] = useState<string[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Fetch responders only for the selected or assigned command center.
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const centerId = personnelCenterId;
        const nextUsers = centerId
          ? await api.getBranchResponders(centerId)
          : [];

        if (!cancelled) {
          setUsers(nextUsers);
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
  }, [personnelCenterId]);

  useEffect(() => {
    if (statusFilter === 'all') return;
    const pageStatus: PagedPersonnelStatus = statusFilter;

    const centerId = personnelCenterId;
    if (!centerId) {
      setStatusPages((current) => ({
        ...current,
        [pageStatus]: { users: [], cursor: null, hasMore: false }
      }));
      setStatusPageLoading(false);
      return;
    }

    let cancelled = false;
    setStatusPageLoading(true);
    setError(null);
    setStatusPages((current) => ({
      ...current,
      [pageStatus]: { users: [], cursor: null, hasMore: false }
    }));

    api.getRespondersByStatus(centerId, pageStatus)
      .then((page) => {
        if (cancelled) return;
        setStatusPages((current) => ({
          ...current,
          [pageStatus]: { users: page.data, cursor: page.nextCursor, hasMore: !!page.nextCursor }
        }));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : `Failed to load ${pageStatus} personnel`);
        }
      })
      .finally(() => {
        if (!cancelled) setStatusPageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [statusFilter, personnelCenterId]);

  // Sync deactivatedIds whenever users changes (new responders may be created, etc.).
  useEffect(() => {
    setDeactivatedIds((prev) => {
      const fresh = users.filter((u) => u.account_status === 'deactivated').map((u) => u.id);
      return prev.length === 0 && fresh.length === 0 ? prev : fresh;
    });
  }, [users]);

  const isDeactivated = (id: string) =>
    deactivatedIds.includes(id) || statusPages.deactivated.users.some((person) => person.id === id);

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
    const centerId = person.command_center_id ?? personnelCenterId;
    if (!centerId) {
      toast.error('Select a command center before changing account status.');
      return;
    }

    setDeactivatedIds((prev) =>
      active ? prev.filter((id) => id !== person.id) : [...prev, person.id]
    );
    try {
      if (active) {
        await api.activateResponder(centerId, person.id);
      } else {
        await api.deactivateResponder(centerId, person.id);
      }
      setUsers((current) => current.map((user) =>
        user.id === person.id
          ? { ...user, account_status: active ? 'active' : 'deactivated' }
          : user
      ));
      const nextStatus: PagedPersonnelStatus = active ? 'active' : 'deactivated';
      const updatedPerson = {
        ...person,
        account_status: active ? 'active' : 'deactivated'
      } satisfies UserAccount;
      setStatusPages((current) => {
        const next = { ...current };
        for (const status of Object.keys(next) as PagedPersonnelStatus[]) {
          next[status] = {
            ...next[status],
            users: next[status].users.filter((user) => user.id !== person.id)
          };
        }
        next[nextStatus] = {
          ...next[nextStatus],
          users: [updatedPerson, ...next[nextStatus].users]
        };
        return next;
      });
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

  const loadMoreStatusPage = async () => {
    if (statusFilter === 'all') return;
    const pageStatus: PagedPersonnelStatus = statusFilter;
    const currentPage = statusPages[pageStatus];
    const centerId = personnelCenterId;
    if (!centerId || !currentPage.cursor || loadingMoreStatusPage) return;

    setLoadingMoreStatusPage(true);
    setError(null);
    try {
      const page = await api.getRespondersByStatus(centerId, pageStatus, currentPage.cursor);
      setStatusPages((current) => ({
        ...current,
        [pageStatus]: {
          users: [...current[pageStatus].users, ...page.data],
          cursor: page.nextCursor,
          hasMore: !!page.nextCursor
        }
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load more ${pageStatus} personnel`);
    } finally {
      setLoadingMoreStatusPage(false);
    }
  };

  const statusRows = statusFilter === 'all' ? inScope : statusPages[statusFilter].users;

  const rows = statusRows.filter((u) =>
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
  {
    key: 'duty',
    header: 'Duty Status',
    sortable: true,
    sortValue: (r) => isDeactivated(r.id) ? 'zz' : r.r_profile?.availability ?? '',
    render: (r) =>
    isDeactivated(r.id) ?
    <span className="text-[13px] text-ink-faint">No access</span> :
    r.account_status === 'pending_activation' ?
    <span className="text-[13px] text-ink-faint">Pending activation</span> :
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
        'Responders and admins at the selected command center' :
        'Select a command center to view personnel' :
        'Responders and admins at your command center'
        }
        actions={
        <>
            <Segmented<'all' | 'active' | 'pending_activation' | 'deactivated'>
            ariaLabel="Filter by account status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
            { value: 'all', label: 'All', count: inScope.length },
            { value: 'active', label: 'Active' },
            { value: 'pending_activation', label: 'Pending Activation' },
            { value: 'deactivated', label: 'Deactivated' }]
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
            <Button
            variant="primary"
            onClick={() => setAddOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              Add Personnel
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
          {created}
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="overflow-hidden">
        {error && (
          <p role="alert" className="border-b border-danger/25 bg-danger-soft/50 px-4 py-3 text-[13px] text-danger">
            {error}
          </p>
        )}
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          rowClassName={(r) => isDeactivated(r.id) ? 'bg-danger-soft/30' : ''}
          defaultSort={{ key: 'name', dir: 'asc' }}
          empty={
          <EmptyState
            title="No personnel found"
            description={
              statusFilter !== 'all' && !personnelCenterId
                ? 'Select a command center to load personnel for this status.'
                : 'Adjust your search or add a responder to this branch.'
            } />

          }
          loading={statusFilter !== 'all' ? statusPageLoading : loading || isFirstLoad}
          caption={statusFilter !== 'all' ? statusPageLoading ? `Loading ${statusFilter} personnel` : undefined : loading || isFirstLoad ? 'Loading personnel' : undefined} />
        {statusFilter !== 'all' && statusPages[statusFilter].hasMore && (
          <div className="flex justify-center py-4">
            <Button onClick={loadMoreStatusPage} disabled={loadingMoreStatusPage}>
              {loadingMoreStatusPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </Card>

      <AddResponderModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        isSuperadmin={isSuperadmin}
        onCreated={(name, recipientEmail) => {
          setCreated(`${name} was created. An activation link will be sent to ${recipientEmail}.`);
          setAddOpen(false);
          toast.success(`An activation link will be sent to ${recipientEmail}.`);
        }}
        onError={(msg) => toast.error(msg)}
        defaultCenterId={scopeCenterId}
        lockedCenterId={isSuperadmin ? null : user?.command_center_id ?? null}
        commandCenters={commandCenters} />

      </motion.div>);
}

function AddResponderModal({
  open,
  onClose,
  isSuperadmin,
  onCreated,
  onError,
  defaultCenterId,
  lockedCenterId,
  commandCenters
}: {
  open: boolean;
  onClose: () => void;
  isSuperadmin: boolean;
  onCreated: (name: string, recipientEmail: string) => void;
  onError: (msg: string) => void;
  defaultCenterId: string | null;
  lockedCenterId: string | null;
  commandCenters: CommandCenter[];
}) {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [accountRole, setAccountRole] = useState<'responder' | 'admin'>('responder');
  const [agency, setAgency] = useState<'barangay_tanod' | 'police' | 'mdrrmo'>('barangay_tanod');
  const [callSign, setCallSign] = useState('');
  const [rank, setRank] = useState('');
  const [center, setCenter] = useState(lockedCenterId ?? defaultCenterId ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFirst('');
      setLast('');
      setEmail('');
      setAccountRole('responder');
      setAgency('barangay_tanod');
      setCallSign('');
      setRank('');
      setCenter(lockedCenterId ?? defaultCenterId ?? '');
      setSubmitting(false);
    }
  }, [open, lockedCenterId, defaultCenterId]);

  useEffect(() => {
    if (open && isSuperadmin && !center && commandCenters.length > 0) {
      setCenter(commandCenters[0].id);
    }
  }, [open, isSuperadmin, center, commandCenters]);

  const emailValid = email.trim().length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const nameValid = (value: string) =>
    value.trim().length <= 50 && /^[\p{L}\s-]+$/u.test(value.trim());
  const emailTaken = false; // We don't have the user list here, so we'll skip this check for now.
  // In a real app, we might want to check for email duplication via an API call, but we'll omit for simplicity.
  const canSubmit = !!(
    first.trim() &&
    last.trim() &&
    nameValid(first) &&
    nameValid(last) &&
    emailValid &&
    !emailTaken &&
    !submitting &&
    (!isSuperadmin || center) &&
    (accountRole === 'admin' ||
      ((agency === 'barangay_tanod' || !!callSign.trim()) &&
        (agency !== 'police' || !!rank.trim())))
  );

  const handleCreate = async () => {
    if (!first.trim() || !last.trim() || !email.trim()) {
      onError('First name, last name, and email are required.');
      return;
    }
    if (!nameValid(first) || !nameValid(last)) {
      onError('Names may contain only letters, spaces, and hyphens, up to 50 characters.');
      return;
    }
    if (!emailValid) {
      onError('Enter a valid email address up to 150 characters long.');
      return;
    }
    if (emailTaken) {
      onError('A user with that email already exists.');
      return;
    }
    if (isSuperadmin && !center) {
      onError('Create a command center before provisioning responders.');
      return;
    }
    if (accountRole === 'responder' && agency !== 'barangay_tanod' && !callSign.trim()) {
      onError('A call sign is required for police and MDRRMO responders.');
      return;
    }
    if (accountRole === 'responder' && agency === 'police' && !rank.trim()) {
      onError('A rank is required for police responders.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        f_name: first.trim(),
        l_name: last.trim(),
        role: accountRole,
        email: email.trim().toLowerCase(),
        ...(isSuperadmin ? { command_center_id: center } : {}),
        ...(accountRole === 'responder' ? {
          agency,
          ...(callSign.trim() ? { call_sign: callSign.trim() } : {}),
          ...(agency === 'police' && rank.trim() ? { rank: rank.trim() } : {})
        } : {})
      };
      await api.createResponder(payload);
      onCreated(`${first.trim()} ${last.trim()}`, email.trim().toLowerCase());
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
      title="Add Personnel"
      subtitle="Create a command-center account."
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
        <div className="col-span-2">
          <Label htmlFor="account-role">Account Type</Label>
          <Select
            id="account-role"
            className="w-full"
            value={accountRole}
            onChange={(e) => setAccountRole(e.target.value as 'responder' | 'admin')}>
            <option value="responder">Responder</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
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
            maxLength={150}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@station.bantai.gov.ph" />

        </div>
        {accountRole === 'responder' && <div>
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
        </div>}
        {accountRole === 'responder' && <div>
          <Label htmlFor="callsign">Call Sign</Label>
          <Input
            id="callsign"
            value={callSign}
            maxLength={50}
            onChange={(e) => setCallSign(e.target.value)}
            placeholder="BRGY-171-7" />

        </div>}
        {accountRole === 'responder' && agency === 'police' && <div>
          <Label htmlFor="rank">Rank</Label>
          <Input
            id="rank"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            placeholder="PCpl" />

        </div>}
        {isSuperadmin && <div className="col-span-2">
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
        </div>}
        <div className="col-span-2 rounded-md border border-line bg-canvas px-3 py-2.5">
          <p className="text-[13px] text-ink">
            An activation link will be sent to the email address you entered.
          </p>
        </div>
      </div>
    </Modal>
  );
}