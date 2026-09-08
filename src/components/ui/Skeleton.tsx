/**
 * Skeleton — animated placeholder block for loading states.
 *
 * Pair with `SkeletonGroup` to render N rows of consistent height. Uses
 * the global `.skeleton` class (defined in `src/index.css`) for the
 * shimmer animation, and respects `prefers-reduced-motion` via the
 * `index.css` `@media` rule.
 */
import React from 'react';
import { twMerge } from 'tailwind-merge';

type Tone = 'surface' | 'elevated' | 'muted';

type Props = {
  /** Tailwind sizing — e.g. "h-4 w-32" or "h-8 w-full". */
  className?: string;
  /** Visual depth tone. `muted` is the lightest (good for inline text). */
  tone?: Tone;
  /** When `true`, render a fully-rounded pill shape (useful for avatars). */
  rounded?: boolean | 'full';
  /** Optional aria-label for accessibility — describes what is loading. */
  'aria-label'?: string;
};

const toneClass: Record<Tone, string> = {
  surface: 'bg-ink/[0.06] dark:bg-ink/10',
  elevated: 'bg-ink/[0.10] dark:bg-ink/15',
  muted: 'bg-ink/[0.04] dark:bg-ink/[0.07]'
};

export function Skeleton({
  className,
  tone = 'surface',
  rounded = false,
  'aria-label': ariaLabel
}: Props) {
  return (
    <span
      role="status"
      aria-label={ariaLabel ?? 'Loading'}
      aria-busy="true"
      className={twMerge(
        'skeleton block',
        toneClass[tone],
        rounded === 'full' ? 'rounded-full' : rounded ? 'rounded-md' : 'rounded-sm',
        className
      )}
    />
  );
}

export default Skeleton;
