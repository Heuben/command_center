import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, SearchIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type MultiSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Shown on the trigger when nothing is selected. */
  placeholder: string;
  ariaLabel: string;
  className?: string;
  panelClassName?: string;
  searchable?: boolean;
  /** Renders the trigger as a plain button (used for the "Filter Actor" control). */
  variant?: 'field' | 'button';
  icon?: React.ReactNode;
};

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  ariaLabel,
  className,
  panelClassName,
  searchable = false,
  variant = 'field',
  icon
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = useMemo(
    () =>
    query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options,
    [options, query]
  );

  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  };

  const triggerLabel =
  selected.length === 0 ?
  placeholder :
  selected.length === 1 ?
  options.find((o) => o.value === selected[0])?.label ?? placeholder :
  `${selected.length} selected`;

  return (
    <div ref={ref} className={twMerge('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={twMerge(
          'inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm transition-colors duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          variant === 'field' ?
          'border-line bg-surface text-ink hover:border-ink-faint' :
          'border-line bg-surface text-ink hover:bg-ink/[0.04]',
          selected.length > 0 && 'border-primary/50 bg-primary-soft text-primary'
        )}>
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate">{triggerLabel}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {selected.length > 1 &&
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
              {selected.length}
            </span>
          }
          <ChevronDownIcon
            className={twMerge(
              'h-4 w-4 shrink-0 opacity-60 transition-transform duration-150 ease-out',
              open && 'rotate-180'
            )} />
          
        </span>
      </button>

      {open &&
      <div
        role="listbox"
        aria-multiselectable
        className={twMerge(
          'absolute right-0 z-40 mt-1.5 w-full min-w-[220px] overflow-hidden rounded-lg border border-line bg-elevated shadow-panel',
          panelClassName
        )}>
          {searchable &&
        <div className="relative border-b border-line">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label={`Search ${ariaLabel}`}
            className="h-9 w-full bg-transparent pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none" />
          
            </div>
        }

          <ul className="max-h-64 overflow-y-auto scrollbar-none py-1">
            {visible.map((o) => {
            const checked = selected.includes(o.value);
            return (
              <li key={o.value}>
                  <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.05]">
                    <span
                    className={twMerge(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      checked ? 'border-primary bg-primary text-white' : 'border-line'
                    )}>
                      {checked && <CheckIcon className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.hint && <span className="shrink-0 text-[11px] text-ink-faint">{o.hint}</span>}
                  </button>
                </li>);

          })}
            {visible.length === 0 &&
          <li className="px-3 py-4 text-center text-[13px] text-ink-muted">No matches</li>
          }
          </ul>

          <div className="flex items-center justify-between border-t border-line px-3 py-2">
            <span className="text-[12px] tabular-nums text-ink-faint">
              {selected.length} selected
            </span>
            <button
            type="button"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
            className="text-[12px] font-medium text-primary transition-colors duration-150 ease-out hover:underline disabled:cursor-not-allowed disabled:text-ink-faint disabled:no-underline">
              Clear
            </button>
          </div>
        </div>
      }
    </div>);

}