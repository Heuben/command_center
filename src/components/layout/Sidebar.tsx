import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BuildingIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ScrollTextIcon,
  SettingsIcon,
  UsersIcon } from
'lucide-react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { useSession } from '../../contexts/SessionContext';
import bantaiIcon2 from '../../bantai_logo_pic_icons/bantai_icon2.png';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{className?: string;}>;
  superadminOnly?: boolean;
  adminLabel?: string;
};

const items: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboardIcon },
  { to: '/personnel', label: 'Personnel', icon: UsersIcon },
  { to: '/audit', label: 'Audit Logs', icon: ScrollTextIcon },
  {
    to: '/incidents',
    label: 'Incident History & Reports',
    adminLabel: 'Incidents & Reporting',
    icon: FileTextIcon
  },
  { to: '/branches', label: 'Branch Management', icon: BuildingIcon, superadminOnly: true },
  { to: '/settings', label: 'Settings', icon: SettingsIcon }
];


export function Sidebar({ collapsed, onToggle }: {collapsed: boolean;onToggle: () => void;}) {
  const { isSuperadmin } = useSession();
  const visible = items.filter((i) => !i.superadminOnly || isSuperadmin);

  return (
    <nav
      aria-label="Primary"
      className={twMerge(
        'flex h-full shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out dark:bg-elevated',
        collapsed ? 'w-16' : 'w-60'
      )}>
      <div
        className={twMerge(
          'flex items-center border-b border-line',
          collapsed ? 'justify-center px-2 py-2.5' : 'px-2.5 py-2.5'
        )}>
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggle}
          className={twMerge(
            'flex min-w-0 items-center gap-2.5 text-left transition-opacity duration-150 ease-out hover:opacity-90',
            collapsed ? 'justify-center' : 'w-full'
          )}>
          <span
            className={twMerge(
              'flex items-center justify-center rounded-xl overflow-hidden',
              collapsed ? 'h-8 w-8 shrink-0' : 'h-9 w-9 shrink-0'
            )}>
            <img src={bantaiIcon2} alt="BANTAI Icon" className="h-full w-full object-contain" />
          </span>

          {!collapsed &&
          <div className="min-w-0 leading-tight">
              <p className="text-[13px] font-semibold tracking-tight text-ink">B.A.N.T.A.I.</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                Command Center
              </p>
            </div>
          }
        </button>
      </div>

      <ul
        className={twMerge(
          'flex-1 space-y-0.5 overflow-y-auto scrollbar-none',
          collapsed ? 'p-1.5' : 'p-2'
        )}>
        {visible.map((item) => {
          const Icon = item.icon;
          const label = !isSuperadmin && item.adminLabel ? item.adminLabel : item.label;
          return (
            <li key={item.to} className="relative flex">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                title={collapsed ? label : undefined}
                className={() => ''}>
                {({ isActive }) => (
                  <span
                    className={twMerge(
                      'relative flex items-center rounded-xl text-[13px] font-medium transition-colors duration-150 ease-out',
                      collapsed ?
                      'h-10 w-10 justify-center self-center' :
                      'w-full justify-start gap-2.5 px-2.5 py-2',
                      isActive ?
                      'text-primary' :
                      'text-ink-muted hover:bg-ink/[0.05] hover:text-ink dark:hover:bg-white/5'
                    )}>
                    {isActive &&
                    <motion.span
                      layoutId="sidebar-active"
                      className={twMerge(
                        'absolute inset-0 -z-10 rounded-xl bg-primary-soft dark:bg-primary/15',
                        collapsed ? 'left-1.5 right-1.5' : ''
                      )}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
                    }
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </span>
                )}
              </NavLink>
            </li>);

        })}
      </ul>

      {!collapsed && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] text-ink-faint">
            {isSuperadmin ? 'System-wide access' : 'Branch-scoped access'}
          </p>
          <p className="text-[11px] text-ink-faint">Desktop client 2.4.1</p>
        </div>
      )}
    </nav>
  );
}