import React, {useEffect, useState} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LogOutIcon,
  MoonIcon,
  SunIcon
} from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { api } from '../lib/api';
import { Button, Card, Input, Label, PageHeader, SectionTitle } from '../components/ui/primitives';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { DUR, EASE } from '../lib/motion';
import { roleLabel } from '../utils/labels';

export function Settings() {
  const { user, theme, setTheme, signOut, isSuperadmin } = useSession();
  const navigate = useNavigate();

  // Local form state — seeded from the current user record.
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Local form state — seeded from the current user record.
  useEffect(() => {
    if (!user) return;
    // We don't have userList here, so we'll try to get the user from the session? Actually, the session user is already the live user.
    // We'll set the form fields from the session user.
    setFirst(user.f_name);
    setLast(user.l_name);
    setEmail(user.email);
  }, [user]);

  // Auto-dismiss the success/error banners after a few seconds.
  useEffect(() => {
    if (savedAt === null && error === null) return;
    const id = window.setTimeout(() => {
      setSavedAt(null);
      setError(null);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [savedAt, error]);

  if (!user) return null;

  const centerName = isSuperadmin ? 'All Branches (system-wide)' : (user.command_center_id ? `Branch ${user.command_center_id}` : 'System');

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
    void (async () => {
      try {
        await api.updateUser(
          user.id,
          {
            f_name: first.trim(),
            l_name: last.trim(),
            email: email.trim()
          }
        );
        setSavedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save profile.');
      } finally {
        setSaving(false);
      }
    })();
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

      <div className="gap-5 xl:grid-cols-3">
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
                <Badge tone="primary">{roleLabel[user.role]}</Badge>
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-ink-muted">Branch Context</p>
                <Badge variant="dot">
                  {centerName}
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
                      theme === 'light' ? 'bg-primary-strong text-white' : 'text-ink-muted hover:text-ink')
                      }>
                <SunIcon className="h-4 w-4" /> Light
              </button>
              <button
                    onClick={() => setTheme('dark')}
                    aria-pressed={theme === 'dark'}
                    className={
                      'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ease-out ' + (
                      theme === 'dark' ? 'bg-primary-strong text-white' : 'text-ink-muted hover:text-ink')
                      }>
                <MoonIcon className="h-4 w-4" /> Dark
              </button>
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
              void signOut().then(() => navigate('/login'));
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
    </div>
  );
}
