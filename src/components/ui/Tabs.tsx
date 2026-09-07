/**
 * Tabs — accessible tab list with animated underline indicator.
 *
 * Follows WAI-ARIA tabs pattern: role="tablist" / role="tab" / role="tabpanel".
 * The active indicator uses layoutId so it slides between tabs smoothly.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

type Tab = {
  id: string;
  label: React.ReactNode;
  panel: React.ReactNode;
};

type TabsProps = {
  tabs: Tab[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
};

export function Tabs({ tabs, defaultIndex = 0, onChange }: TabsProps) {
  const [active, setActive] = useState(defaultIndex);

  const handleSelect = (i: number) => {
    setActive(i);
    onChange?.(i);
  };

  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleSelect((i + 1) % tabs.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleSelect((i - 1 + tabs.length) % tabs.length);
    }
  };

  return (
    <div>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="relative flex gap-0.5 border-b border-line">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === i}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => handleSelect(i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={twMerge(
              'relative px-4 py-2 text-[13px] font-medium transition-colors duration-150 ease-out',
              active === i ? 'text-primary' : 'text-ink-muted hover:text-ink'
            )}>
            {tab.label}
          </button>
        ))}
        <motion.span
          layoutId="tabs-indicator"
          className="absolute bottom-0 h-0.5 bg-primary"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={active !== i}
          tabIndex={0}
          className={active === i ? 'pt-4' : 'hidden'}>
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
