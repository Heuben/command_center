import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOutIcon, MoonIcon, SunIcon, Volume2Icon } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { useDispatchData } from '../contexts/DispatchContext';
import { centerName } from '../data/commandCenters';
import { roleLabel } from '../utils/labels';
import { Button, Card, Input, Label, PageHeader, SectionTitle } from '../components/ui/primitives';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { DUR, EASE } from '../lib/motion';

export function Settings() {
  const { user, theme, setTheme, sirenVolume, setSirenVolume, signOut, isSuperadmin } =
  useSession();
  const { updateUser, userList } = useDispatchData();
  const navigate = useNavigate();
  const [testing, setTesting] = useState(false);

  // Local form state — seeded from the current user record.
  const liveUser = user ? userList.find((u) => u.id === user.id) ?? user : null;
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!liveUser) return;
    setFirst(liveUser.f_name);
    setLast(liveUser.l_name);
    setEmail(liveUser.email);
  }, [liveUser?.id, liveUser?.f_name, liveUser?.l_name, liveUser?.email]);

  // Auto-dismiss the success/error banners after a few seconds.
  useEffect(() => {
    if (savedAt === null && error === null) return;
    const id = window.setTimeout(() => {
      setSavedAt(null);
      setError(null);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [savedAt, error]);

  if (!user || !liveUser) return null;

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!first.trim() || !last.trim()) {
      setError('Name fields cannot be empty.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid work email.');
      return;
    }
    setSaving(true);
    try {
      updateUser(
        liveUser.id,
        {
          f_name: first.trim(),
          l_name: last.trim(),
          email: email.trim()
        },
        liveUser.id
      );
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <PageHeader
        title="Settings"
        subtitle="Your profile, workstation preferences, and session." />
      

      <AnimatePresence>
        {savedAt !== null && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } }}
            exit={{ opacity: 0, y: -4, transition: { duration: DUR.fast, ease: EASE.in } }}
            className="mb-4 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-[13px] text-success">
            Profile saved.
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

      <div className="grid gap-5 xl:grid-cols-3">
      <form onSubmit={submitProfile} className="xl:col-span-2">
        <Card className="mb-5 xl:mb-0">
          <SectionTitle>Profile</SectionTitle>
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <Label htmlFor="p-name">First Name</Label>
              <Input
                  id="p-name"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  placeholder="First name" />
                
            </div>
            <div>
              <Label htmlFor="p-last">Last Name</Label>
              <Input
                  id="p-last"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  placeholder="Last name" />
                
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="p-email">Work Email</Label>
              <Input
                  id="p-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@station.bantai.gov.ph" />
                
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink-muted">Role</p>
              <Badge tone="primary">{roleLabel[liveUser.role]}</Badge>
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink-muted">Branch Context</p>
              <Badge variant="dot">
                {isSuperadmin ?
                  'All Branches (system-wide)' :
                  centerName(liveUser.command_center_id)}
              </Badge>
            </div>
          </div>
          <div className="flex justify-end border-t border-line px-4 py-3">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Profile'}
            </Button>
          </div>
        </Card>
      </form>

      <div className="space-y-5">
      <Card>
        <SectionTitle>Appearance</SectionTitle>
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <p className="text-[13px] font-medium text-ink">Theme</p>
            <p className="text-[13px] text-ink-muted">
              Dark mode is intended for night-shift workstations.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-line bg-surface p-1">
            <button
                  onClick={() => setTheme('light')}
                  aria-pressed={theme === 'light'}
                  className={
                  'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ease-out ' + (
                  theme === 'light' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink')
                  }>
              <SunIcon className="h-4 w-4" /> Light
            </button>
            <button
                  onClick={() => setTheme('dark')}
                  aria-pressed={theme === 'dark'}
                  className={
                  'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ease-out ' + (
                  theme === 'dark' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink')
                  }>
              <MoonIcon className="h-4 w-4" /> Dark
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Alert Siren</SectionTitle>
        <div className="space-y-4 p-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="siren" className="mb-0">
                Siren Volume
              </Label>
              <span className="text-[13px] font-medium tabular-nums text-ink">
                {sirenVolume}%
              </span>
            </div>
            <input
                  id="siren"
                  type="range"
                  min={0}
                  max={100}
                  value={sirenVolume}
                  onChange={(e) => setSirenVolume(Number(e.target.value))}
                  className="w-full accent-[rgb(var(--primary))]" />
                
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] text-ink-muted">
              Plays when a new alert reaches this branch's queue.
            </p>
            <Button
                  onClick={() => {
                    setTesting(true);
                    window.setTimeout(() => setTesting(false), 1200);
                  }}>
              <Volume2Icon className="h-4 w-4" />
              {testing ? 'Playing…' : 'Test Siren'}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Session</SectionTitle>
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <p className="text-[13px] font-medium text-ink">Sign out of this workstation</p>
            <p className="text-[13px] text-ink-muted">Ends the session and records a log entry.</p>
          </div>
          <Button variant="danger" onClick={() => setSigningOut(true)}>
            <LogOutIcon className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </Card>
      </div>
      </div>

      <Modal
        open={signingOut}
        onClose={() => setSigningOut(false)}
        title="Sign out of this workstation?"
        subtitle="You will need to enter your credentials to sign back in."
        footer={
        <>
            <Button onClick={() => setSigningOut(false)}>Cancel</Button>
            <Button
            variant="danger"
            onClick={() => {
              setSigningOut(false);
              signOut();
              navigate('/login');
            }}>
              <LogOutIcon className="h-4 w-4" />
              Sign Out
            </Button>
          </>
        }>
        <p className="text-[13px] text-ink-muted">
          Are you sure you want to sign out now? Any unsaved work in this session will be lost.
        </p>
      </Modal>
    </div>);

}