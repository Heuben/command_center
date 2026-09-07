import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { DUR, EASE } from '../lib/motion';
import { commandCenters as seedCenters } from '../data/commandCenters';
import { userName, users as seedUsers } from '../data/users';
import type { CommandCenter } from '../types';
import { centerTypeLabel } from '../utils/labels';
import { formatDate } from '../utils/time';
import { DataTable } from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Button, Card, Input, Label, PageHeader, Select } from '../components/ui/primitives';
import { Modal } from '../components/ui/Modal';
import { MultiSelect } from '../components/ui/MultiSelect';
import { LocationPicker } from '../components/ui/LocationPicker';

type CenterType = CommandCenter['type'];

const TYPE_OPTIONS: CenterType[] = ['barangay', 'police_station', 'mdrrmo'];

const emptyDraft = (): {
  name: string;
  type: CenterType;
  branch: string;
  lat: string;
  lng: string;
  adminIds: string[];
} => ({
  name: '',
  type: 'barangay',
  branch: '',
  lat: '',
  lng: '',
  adminIds: []
});

export function BranchManagement() {
  const [centers, setCenters] = useState<CommandCenter[]>(seedCenters);
  const [users] = useState(seedUsers);
  const [editing, setEditing] = useState<CommandCenter | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CommandCenter | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (notice === null && error === null) return;
    const id = window.setTimeout(() => {
      setNotice(null);
      setError(null);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [notice, error]);

  const adminUsers = useMemo(() => users.filter((u) => u.role === 'admin'), [users]);

  /** Admins with no branch yet, plus the ones already on the branch being edited. */
  const assignableAdmins = useMemo(() => {
    const currentIds = editing?.admin_ids ?? [];
    return adminUsers.filter((u) => !u.command_center_id || currentIds.includes(u.id));
  }, [adminUsers, editing]);

  const save = (
  next: Omit<CommandCenter, 'id' | 'created_at'> & {id?: string;created_at?: string;}) =>
  {
    if (next.id) {
      setCenters((prev) =>
      prev.map((c) => c.id === next.id ? { ...c, ...next, id: c.id } as CommandCenter : c)
      );
      setNotice(`${next.name} was updated.`);
    } else {
      const id = `cc-${Date.now().toString(36)}`;
      const created: CommandCenter = {
        ...next,
        id,
        created_at: new Date().toISOString()
      } as CommandCenter;
      setCenters((prev) => [...prev, created]);
      setNotice(`${created.name} was registered.`);
    }
    setCreating(false);
    setEditing(null);
  };

  const remove = (center: CommandCenter) => {
    const personnelCount = users.filter((u) => u.command_center_id === center.id).length;
    if (personnelCount > 0) {
      setError(
        `Cannot delete ${center.name}: ${personnelCount} personnel are still assigned. Reassign them first.`
      );
      setDeleting(null);
      return;
    }
    setCenters((prev) => prev.filter((c) => c.id !== center.id));
    setNotice(`${center.name} was removed.`);
    setDeleting(null);
  };

  const columns: Column<CommandCenter>[] = [
  {
    key: 'name',
    header: 'Command Center',
    sortable: true,
    sortValue: (c) => c.name,
    render: (c) =>
    <div>
          <p className="font-medium text-ink">{c.name}</p>
          <p className="text-[12px] text-ink-muted">{c.branch}</p>
        </div>

  },
  {
    key: 'type',
    header: 'Type',
    sortable: true,
    sortValue: (c) => c.type,
    render: (c) => <Badge tone="primary">{centerTypeLabel[c.type]}</Badge>
  },
  {
    key: 'admins',
    header: 'Assigned Admins',
    render: (c) =>
    <div className="flex flex-wrap gap-1.5">
          {c.admin_ids.map((id) =>
      <Badge key={id} variant="dot">
              {userName(id)}
            </Badge>
      )}
        </div>

  },
  {
    key: 'personnel',
    header: 'Personnel',
    align: 'right',
    sortable: true,
    sortValue: (c) => users.filter((u) => u.command_center_id === c.id).length,
    render: (c) => users.filter((u) => u.command_center_id === c.id).length
  },
  {
    key: 'location',
    header: 'Coordinates',
    render: (c) =>
    <span className="font-mono text-[12px] tabular-nums text-ink-muted">
          {c.location.lat.toFixed(4)}, {c.location.lng.toFixed(4)}
        </span>

  },
  {
    key: 'created',
    header: 'Created',
    sortable: true,
    sortValue: (c) => c.created_at,
    render: (c) =>
    <span className="text-[13px] tabular-nums text-ink-muted">{formatDate(c.created_at)}</span>

  },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    width: '120px',
    align: 'right',
    render: (c) =>
    <div className="flex justify-end gap-1.5">
          <Button size="sm" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
            <PencilIcon className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
        size="sm"
        variant="danger"
        onClick={() => setDeleting(c)}
        aria-label={`Delete ${c.name}`}>
            <Trash2Icon className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>

  }];


  return (
    <>
      <PageHeader
        title="Branch Management"
        subtitle="Command center nodes registered on the network and the admins who run them."
        actions={
        <Button variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon className="h-4 w-4" />
            New Branch
          </Button>
        } />
      

      <AnimatePresence>
        {notice && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } }}
            exit={{ opacity: 0, y: -4, transition: { duration: DUR.fast, ease: EASE.in } }}
            className="mb-4 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-[13px] text-success">
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {error && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } }}
            exit={{ opacity: 0, y: -4, transition: { duration: DUR.fast, ease: EASE.in } }}
            className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger">
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={centers}
          rowKey={(c) => c.id}
          defaultSort={{ key: 'name', dir: 'asc' }} />
        
      </Card>

      <BranchForm
        open={creating || !!editing}
        center={editing}
        adminUsers={assignableAdmins}
        onCancel={() => {
          setCreating(false);
          setEditing(null);
          setError(null);
        }}
        onError={setError}
        onSubmit={save} />
      

      <ConfirmDeleteModal
        center={deleting}
        personnelCount={
        deleting ? users.filter((u) => u.command_center_id === deleting.id).length : 0
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)} />
      
    </>);

}

function BranchForm({
  open,
  center,
  adminUsers,
  onCancel,
  onError,
  onSubmit







}: {open: boolean;center: CommandCenter | null;adminUsers: {id: string;email: string;role: string;}[];onCancel: () => void;onError: (msg: string) => void;onSubmit: (next: Omit<CommandCenter, 'id' | 'created_at'> & {id?: string;}) => void;}) {
  const [draft, setDraft] = useState(() => emptyDraft());
  const [submitting, setSubmitting] = useState(false);

  // Reset the form whenever the modal opens for a new center.
  useEffect(() => {
    if (!open) return;
    if (center) {
      setDraft({
        name: center.name,
        type: center.type,
        branch: center.branch,
        lat: String(center.location.lat),
        lng: String(center.location.lng),
        adminIds: center.admin_ids
      });
    } else {
      setDraft(emptyDraft());
    }
    setSubmitting(false);
  }, [open, center]);

  const lat = Number(draft.lat);
  const lng = Number(draft.lng);
  const validLat = Number.isFinite(lat) && lat >= -90 && lat <= 90;
  const validLng = Number.isFinite(lng) && lng >= -180 && lng <= 180;
  const canSubmit =
  !!draft.name.trim() &&
  !!draft.branch.trim() &&
  validLat &&
  validLng &&
  draft.adminIds.length > 0 &&
  !submitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!draft.name.trim()) return onError('Name is required.');
    if (!draft.branch.trim()) return onError('Coverage area is required.');
    if (!validLat) return onError('Latitude must be a number between -90 and 90.');
    if (!validLng) return onError('Longitude must be a number between -180 and 180.');
    if (draft.adminIds.length === 0) return onError('Assign at least one admin to this branch.');

    setSubmitting(true);
    try {
      onSubmit({
        id: center?.id,
        name: draft.name.trim(),
        type: draft.type,
        branch: draft.branch.trim(),
        location: { lat, lng },
        admin_ids: draft.adminIds
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save branch.');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={center ? `Edit ${center.name}` : 'Create Command Center'}
      subtitle={
      center ?
      'Update branch details, coverage location, and assigned admin.' :
      'Register a new branch node and assign its first admin.'
      }
      footer={
      <>
          <Button onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="branch-form" disabled={!canSubmit}>
            {submitting ? 'Saving…' : center ? 'Save Changes' : 'Create Branch'}
          </Button>
        </>
      }>
      <form id="branch-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="cc-name">Name</Label>
          <Input
            id="cc-name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Barangay 172"
            required />
          
        </div>
        <div>
          <Label htmlFor="cc-type">Type</Label>
          <Select
            id="cc-type"
            className="w-full"
            value={draft.type}
            onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as CenterType }))}>
            {TYPE_OPTIONS.map((t) =>
            <option key={t} value={t}>
                {centerTypeLabel[t]}
              </option>
            )}
          </Select>
        </div>
        <div>
          <Label htmlFor="cc-branch">Coverage Area</Label>
          <Input
            id="cc-branch"
            value={draft.branch}
            onChange={(e) => setDraft((d) => ({ ...d, branch: e.target.value }))}
            placeholder="Caloocan City, District 2"
            required />
          
        </div>
        <div className="col-span-2">
          <Label>Branch Location</Label>
          <LocationPicker
            lat={draft.lat}
            lng={draft.lng}
            onChange={(next) => setDraft((d) => ({ ...d, lat: next.lat, lng: next.lng }))}
            latInvalid={!!draft.lat && !validLat}
            lngInvalid={!!draft.lng && !validLng} />
          
        </div>
        <div className="col-span-2">
          <Label>Assigned Admins</Label>
          <MultiSelect
            ariaLabel="Assign admins to this branch"
            placeholder={
            adminUsers.length === 0 ? 'No unassigned admins available' : 'Select admins...'
            }
            options={adminUsers.map((a) => ({
              value: a.id,
              label: userName(a.id),
              hint: a.email
            }))}
            selected={draft.adminIds}
            onChange={(ids) => setDraft((d) => ({ ...d, adminIds: ids }))}
            searchable
            className="w-full" />
          
          <p className="mt-1.5 text-[12px] text-ink-muted">
            Only admin accounts without a command center are listed. Admins already on this branch
            stay selectable.
          </p>
        </div>
      </form>
    </Modal>);

}

function ConfirmDeleteModal({
  center,
  personnelCount,
  onCancel,
  onConfirm





}: {center: CommandCenter | null;personnelCount: number;onCancel: () => void;onConfirm: () => void;}) {
  const [confirmText, setConfirmText] = useState('');
  useEffect(() => {
    if (center) setConfirmText('');
  }, [center]);
  if (!center) return null;
  const canConfirm = confirmText.trim() === center.name && personnelCount === 0;
  return (
    <Modal
      open={!!center}
      onClose={onCancel}
      title={`Delete ${center.name}?`}
      subtitle="This permanently removes the command center from the network."
      footer={
      <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" disabled={!canConfirm} onClick={onConfirm}>
            Delete branch
          </Button>
        </>
      }>
      <div className="space-y-3 text-[13px] text-ink">
        <p>
          {personnelCount > 0 ?
          `${personnelCount} personnel are still assigned to this branch. Reassign them before deleting.` :
          'No personnel are currently assigned. This action is safe to proceed.'}
        </p>
        {personnelCount === 0 &&
        <p>
            Type the branch name <span className="font-mono font-semibold">{center.name}</span> to
            confirm.
          </p>
        }
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type branch name to confirm"
          disabled={personnelCount > 0} />
        
      </div>
    </Modal>);

}