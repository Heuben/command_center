import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuitIcon,
  Building2Icon,
  Globe2Icon,
  KeyRoundIcon,
  LogOutIcon,
  MoonIcon,
  ServerCogIcon,
  SunIcon,
  Volume2Icon,
  WebhookIcon
} from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { useDispatchData } from '../contexts/DispatchContext';
import { centerName } from '../data/commandCenters';
import { roleLabel } from '../utils/labels';
import { Button, Card, Input, Label, PageHeader, SectionTitle } from '../components/ui/primitives';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { DUR, EASE } from '../lib/motion';
import { useToast } from '../hooks/useToast';

type GlobalSettings = {
  infrastructureRegion: string;
  apiBaseUrl: string;
  webhookUrl: string;
  aiConfidenceThreshold: number;
  defaultRoutingMode: 'nearest' | 'balanced';
  branchProvisioning: 'manual' | 'approved';
};

type LocalSettings = {
  workstationName: string;
  branchNotes: string;
  audioAlertsEnabled: boolean;
  sirenVolume: number;
};

const GLOBAL_SETTINGS_KEY = 'bantai-system-settings';

const defaultGlobalSettings: GlobalSettings = {
  infrastructureRegion: 'Metro Manila Operations',
  apiBaseUrl: 'https://api.bantai.gov.ph/v1',
  webhookUrl: 'https://hooks.bantai.gov.ph/alerts',
  aiConfidenceThreshold: 80,
  defaultRoutingMode: 'nearest',
  branchProvisioning: 'approved'
};

function localSettingsKey(userId: string, centerId: string) {
  return `bantai-local-settings:${userId}:${centerId}`;
}

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
  } catch {
    return fallback;
  }
}

export function Settings() {
  const { user, theme, setTheme, sirenVolume, setSirenVolume, signOut, isSuperadmin } =
  useSession();
  const { updateUser, userList } = useDispatchData();
  const toast = useToast();
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
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(defaultGlobalSettings);
  const [localSettings, setLocalSettings] = useState<LocalSettings>({
    workstationName: 'Command Center Workstation',
    branchNotes: '',
    audioAlertsEnabled: true,
    sirenVolume: 70
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const branchId = liveUser?.command_center_id ?? 'system';

  useEffect(() => {
    setGlobalSettings(readStored(GLOBAL_SETTINGS_KEY, defaultGlobalSettings));
  }, []);

  useEffect(() => {
    if (!liveUser) return;
    setLocalSettings(
      readStored(localSettingsKey(liveUser.id, liveUser.command_center_id), {
        workstationName: 'Command Center Workstation',
        branchNotes: '',
        audioAlertsEnabled: true,
        sirenVolume: 70
      })
    );
    const stored = readStored(localSettingsKey(liveUser.id, liveUser.command_center_id), {
      workstationName: 'Command Center Workstation',
      branchNotes: '',
      audioAlertsEnabled: true,
      sirenVolume: 70
    });
    setSirenVolume(stored.sirenVolume);
  }, [liveUser?.id, liveUser?.command_center_id]);

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

  const handleSaveSettings = (scope: 'global' | 'local') => {
    if (!isSuperadmin && scope === 'global') {
      toast.error('Superadmin restricted: global settings cannot be changed by admins.');
      return;
    }
    setSavingSettings(true);
    try {
      if (scope === 'global') {
        window.localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(globalSettings));
        toast.success('System settings saved.');
      } else {
        window.localStorage.setItem(
          localSettingsKey(liveUser.id, branchId),
          JSON.stringify({ ...localSettings, sirenVolume })
        );
        toast.success('Local workstation settings saved.');
      }
    } catch {
      toast.error('Settings could not be saved on this device.');
    } finally {
      setSavingSettings(false);
    }
  };

  const updateGlobal = <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => {
    if (!isSuperadmin) {
      toast.error('Superadmin restricted: this setting is read-only for admins.');
      return;
    }
    setGlobalSettings((prev) => ({ ...prev, [key]: value }));
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

      {isSuperadmin &&
      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <SectionTitle>
            <span className="inline-flex items-center gap-2"><ServerCogIcon className="h-4 w-4" /> Global Infrastructure</span>
          </SectionTitle>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="infrastructure-region">Operations Region</Label>
              <Input
                id="infrastructure-region"
                value={globalSettings.infrastructureRegion}
                onChange={(e) => updateGlobal('infrastructureRegion', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="api-base-url">API Base URL</Label>
              <Input
                id="api-base-url"
                value={globalSettings.apiBaseUrl}
                onChange={(e) => updateGlobal('apiBaseUrl', e.target.value)} />
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>
            <span className="inline-flex items-center gap-2"><WebhookIcon className="h-4 w-4" /> API / Webhook Config</span>
          </SectionTitle>
          <div className="p-4">
            <Label htmlFor="webhook-url">Alert Webhook URL</Label>
            <Input
              id="webhook-url"
              value={globalSettings.webhookUrl}
              onChange={(e) => updateGlobal('webhookUrl', e.target.value)} />
            <p className="mt-1.5 text-[12px] text-ink-muted">Used by all branches for outbound incident notifications.</p>
          </div>
        </Card>

        <Card>
          <SectionTitle>
            <span className="inline-flex items-center gap-2"><Globe2Icon className="h-4 w-4" /> Cross-Branch Defaults</span>
          </SectionTitle>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="routing-mode">Default responder routing</Label>
              <select
                id="routing-mode"
                value={globalSettings.defaultRoutingMode}
                onChange={(e) => updateGlobal('defaultRoutingMode', e.target.value as GlobalSettings['defaultRoutingMode'])}
                className="h-9 w-full rounded-md border border-line bg-surface px-2.5 text-sm text-ink">
                <option value="nearest">Nearest available unit</option>
                <option value="balanced">Balanced branch coverage</option>
              </select>
            </div>
            <div>
              <Label htmlFor="branch-provisioning">Branch provisioning</Label>
              <select
                id="branch-provisioning"
                value={globalSettings.branchProvisioning}
                onChange={(e) => updateGlobal('branchProvisioning', e.target.value as GlobalSettings['branchProvisioning'])}
                className="h-9 w-full rounded-md border border-line bg-surface px-2.5 text-sm text-ink">
                <option value="approved">Requires approval</option>
                <option value="manual">Superadmin only</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>
            <span className="inline-flex items-center gap-2"><BrainCircuitIcon className="h-4 w-4" /> AI Model Confidence</span>
          </SectionTitle>
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="ai-threshold" className="mb-0">Minimum confidence threshold</Label>
              <span className="text-[13px] font-semibold tabular-nums text-ink">{globalSettings.aiConfidenceThreshold}%</span>
            </div>
            <input
              id="ai-threshold"
              type="range"
              min={50}
              max={100}
              value={globalSettings.aiConfidenceThreshold}
              onChange={(e) => updateGlobal('aiConfidenceThreshold', Number(e.target.value))}
              className="w-full accent-[rgb(var(--primary))]" />
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <SectionTitle>
            <span className="inline-flex items-center gap-2"><Building2Icon className="h-4 w-4" /> Branch CRUD Settings</span>
          </SectionTitle>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[13px] font-medium text-ink">System-wide branch administration</p>
              <p className="text-[13px] text-ink-muted">Create, rename, archive, and reassign command centers.</p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/branches')}>
              Manage Branches
            </Button>
          </div>
          <div className="flex justify-end border-t border-line px-4 py-3">
            <Button type="button" variant="primary" disabled={savingSettings} onClick={() => handleSaveSettings('global')}>
              {savingSettings ? 'Saving…' : 'Save System Settings'}
            </Button>
          </div>
        </Card>
      </div>}

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
        <SectionTitle>
          <span className="inline-flex items-center gap-2"><KeyRoundIcon className="h-4 w-4" /> Local Branch &amp; Workstation</span>
        </SectionTitle>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink-muted">Branch profile</p>
              <Badge variant="dot">{centerName(liveUser.command_center_id)}</Badge>
            </div>
            <div>
              <Label htmlFor="workstation-name">Workstation name</Label>
              <Input
                id="workstation-name"
                value={localSettings.workstationName}
                onChange={(e) => setLocalSettings((prev) => ({ ...prev, workstationName: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="branch-notes">Local branch notes</Label>
            <Input
              id="branch-notes"
              value={localSettings.branchNotes}
              onChange={(e) => setLocalSettings((prev) => ({ ...prev, branchNotes: e.target.value }))}
              placeholder="Optional notes for this workstation" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-muted">
            <input
              type="checkbox"
              checked={localSettings.audioAlertsEnabled}
              onChange={(e) => setLocalSettings((prev) => ({ ...prev, audioAlertsEnabled: e.target.checked }))}
              className="h-4 w-4 rounded border-line accent-[rgb(var(--primary))]" />
            Enable audio alerts on this workstation
          </label>
          <div className="flex justify-end border-t border-line pt-3">
            <Button type="button" variant="primary" disabled={savingSettings} onClick={() => handleSaveSettings('local')}>
              {savingSettings ? 'Saving…' : 'Save Local Settings'}
            </Button>
          </div>
        </div>
      </Card>

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
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSirenVolume(value);
                    setLocalSettings((prev) => ({ ...prev, sirenVolume: value }));
                  }}
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