import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Skeleton } from './Skeleton';

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right';
  width?: string;
  /** Value used for sorting; falls back to the raw row when omitted. */
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  defaultSort?: {key: string;dir: 'asc' | 'desc';};
  empty?: React.ReactNode;
  rowClassName?: (row: T) => string;
  /** Show skeleton rows in place of real data. */
  loading?: boolean;
  /** Accessible caption for the table, rendered visually above the table. */
  caption?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  defaultSort,
  empty,
  rowClassName,
  loading = false,
  caption
}: Props<T>) {
  const [sort, setSort] = useState<{key: string;dir: 'asc' | 'desc';} | null>(
    defaultSort ?? null
  );

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      // Coerce to comparable primitives so we never compare `string` to `number`
      // (which would silently coerce to NaN and break ordering). Missing values
      // sort last on ascending, first on descending.
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns]);

  const toggle = (key: string) => {
    setSort((prev) =>
    prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );
  };

  return (
    <div className="overflow-x-auto">
      {caption &&
      <p className="sr-only" role="status" aria-live="polite">
          {caption}
        </p>
      }
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-ink/[0.02]">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  style={{ width: c.width }}
                  className={twMerge(
                    'whitespace-nowrap px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-ink-muted',
                    c.align === 'right' ? 'text-right' : 'text-left'
                  )}>
                  {c.sortable ?
                  <button
                    type="button"
                    onClick={() => toggle(c.key)}
                    aria-sort={
                    active ? sort!.dir === 'asc' ? 'ascending' : 'descending' : 'none'
                    }
                    className={twMerge(
                      'inline-flex items-center gap-1 rounded transition-colors duration-150 ease-out hover:text-ink',
                      active && 'text-ink',
                      c.align === 'right' && 'flex-row-reverse'
                    )}>
                      {c.header}
                      {active ?
                    sort!.dir === 'asc' ?
                    <ChevronUpIcon className="h-3.5 w-3.5" /> :

                    <ChevronDownIcon className="h-3.5 w-3.5" /> :


                    <ChevronsUpDownIcon className="h-3.5 w-3.5 opacity-40" />
                    }
                    </button> :

                  c.header
                  }
                </th>);

            })}
          </tr>
        </thead>
        <tbody>
          {loading ?
          Array.from({ length: 6 }, (_, i) =>
          <tr key={`sk-${i}`} className="border-b border-line/70 last:border-0">
              {columns.map((c, ci) =>
            <td key={c.key} className="px-4 py-3">
                  <Skeleton
                  className={ci === 0 ? 'h-3.5 w-32' : 'h-3.5 w-20'}
                  tone={i % 2 === 0 ? 'surface' : 'muted'} />
                </td>
            )}
            </tr>
          ) :

          <AnimatePresence initial={false}>
            {sorted.map((row, i) =>
            <motion.tr
              key={rowKey(row)}
              layout="position"
              initial={{ opacity: 0, y: 4 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1], delay: Math.min(i * 0.015, 0.18) }
              }}
              exit={{ opacity: 0, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
              onRowClick ?
              (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row);
                }
              } :
              undefined
              }
              className={twMerge(
                'group relative border-b border-line/70 align-middle transition-colors duration-150 ease-out last:border-0',
                onRowClick &&
                'cursor-pointer hover:bg-primary-soft/60 focus-visible:bg-primary-soft/60 focus-visible:outline-none'
              )}>
                {onRowClick && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-primary opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                )}
                {columns.map((c) =>
              <td
                key={c.key}
                className={twMerge(
                  'px-4 py-3 align-middle text-ink',
                  c.align === 'right' && 'text-right tabular-nums'
                )}
                style={{ verticalAlign: 'middle' }}>
                <div
                  className={twMerge(
                    'flex min-h-[2.75rem] flex-col justify-center leading-[1.25]',
                    c.align === 'right' ? 'items-end' : 'items-start'
                  )}>
                  {c.render(row)}
                </div>
              </td>
              )}
              </motion.tr>
            )}
          </AnimatePresence>
          }
        </tbody>
      </table>
      {!loading && sorted.length === 0 && empty}
    </div>);

}
