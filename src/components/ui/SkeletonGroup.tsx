/**
 * SkeletonGroup — render N skeleton rows / cards with consistent spacing.
 *
 * Pass an `item` render function to control the shape of each placeholder
 * (e.g. simulate a table row with multiple bars, or a card with avatar
 * and text). When the parent transitions to real data, the skeleton
 * unmounts cleanly.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from './Skeleton';
import { fadeUp, useMotionVariants } from '../../lib/motion';

type Props = {
  /** How many placeholder rows to render. */
  count: number;
  /** A render function describing the shape of one row. */
  item: (index: number) => React.ReactNode;
  /** Vertical spacing between rows. */
  gap?: 'tight' | 'normal' | 'loose';
  /** Optional aria-label for the whole list. */
  'aria-label'?: string;
};

const gapClass: Record<NonNullable<Props['gap']>, string> = {
  tight: 'space-y-1.5',
  normal: 'space-y-3',
  loose: 'space-y-5'
};

export function SkeletonGroup({
  count,
  item,
  gap = 'normal',
  'aria-label': ariaLabel
}: Props) {
  const v = useMotionVariants(fadeUp);
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel ?? 'Loading content'}
      className={gapClass[gap]}
    >
      {Array.from({ length: count }, (_, i) => (
        <motion.div key={i} variants={v} initial="hidden" animate="show">
          {item(i)}
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Convenience helper: a "row" skeleton that mimics a table row with
 * 3 placeholder cells (avatar, label, trailing element).
 */
export function SkeletonRow({ width = 'w-full' }: { width?: string }) {
  return (
    <div className={`flex items-center gap-3 ${width}`}>
      <Skeleton className="h-8 w-8 shrink-0" rounded="full" />
      <Skeleton className="h-3.5 flex-1 max-w-[180px]" />
      <Skeleton className="h-3.5 w-16 ml-auto" />
    </div>
  );
}

export default SkeletonGroup;
