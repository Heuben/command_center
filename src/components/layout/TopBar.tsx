import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOutIcon, MoonIcon, SunIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../../contexts/SessionContext';
import { commandCenters, centerName } from '../../data/commandCenters';
import { fullName, roleLabel } from '../../utils/labels';
import { Button, Select } from '../ui/primitives';
import { formatClock } from '../../utils/time';
import { Modal } from '../ui/Modal';

export function TopBar() {
  const { user, isSuperadmin, branchFilter, setBranchFilter, theme, setTheme, signOut, now } =
  useSession();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const branchContext = isSuperadmin ?
  branchFilter === 'all' ?
  'All Branches' :
  centerName(branchFilter) :
  centerName(user.command_center_id);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface/95 px-5 backdrop-blur supports-[backdrop-filter]:bg-surface/80 dark:bg-elevated/80">
      <div className="flex items-center gap-3">
        <div className="leading-tight">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Branch Context</p>
          <p className="text-[13px] font-semibold text-ink">{branchContext}</p>
        </div>
        {isSuperadmin &&
        <>
            <span className="h-6 w-px bg-line" aria-hidden />
            <Select
            aria-label="Filter by branch"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-8 text-[13px]">
              <option value="all">All Branches</option>
              {commandCenters.map((c) =>
            <option key={c.id} value={c.id}>
                  {c.name}
                </option>
            )}
            </Select>
          </>
        }
      </div>

      <div className="flex items-center gap-3">
        <p className="hidden text-[13px] tabular-nums text-ink-muted md:block">
          {formatClock(new Date(now).toISOString())} PHT
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 0, scale: 1, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } }}
              exit={{ opacity: 0, rotate: 90, scale: 0.8, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } }}
              className="flex items-center justify-center">
              {theme === 'light' ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
            </motion.span>
          </AnimatePresence>
        </Button>
        <span className="h-6 w-px bg-line" aria-hidden />
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-[12px] font-semibold text-primary">
            {user.f_name[0]}
            {user.l_name[0]}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-[13px] font-medium text-ink">{fullName(user)}</p>
            <p className="text-[11px] text-ink-muted">{roleLabel[user.role]}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" aria-label="Sign out" onClick={() => setSigningOut(true)}>
          <LogOutIcon className="h-4 w-4" />
        </Button>
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
    </header>);

}