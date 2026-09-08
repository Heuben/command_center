/**
 * Motion design tokens — single source of truth for the project's
 * animation language. Components compose these constants via
 * `useMotionVariants` so that `prefers-reduced-motion` is respected
 * everywhere automatically.
 *
 * @example
 *   const v = useMotionVariants(fadeUp);
 *   <motion.div variants={v} initial="hidden" animate="show" />
 */
import { useMemo } from 'react';
import type { Variants } from 'framer-motion';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/* -------------------------------------------------------------------------- */
/* Tokens                                                                      */
/* -------------------------------------------------------------------------- */

/** Cubic-bezier easing curves. Use as `transition: { ease: EASE.out }`. */
export const EASE = {
  /** "Decelerate" — for entries. Smooth, organic, professional. */
  out: [0.23, 1, 0.32, 1] as [number, number, number, number],
  /** "Accelerate" — for exits. */
  in: [0.4, 0, 1, 1] as [number, number, number, number],
  /** "In-out" — for state changes (e.g. tab indicators). */
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number]
};

/** Animation durations in seconds. */
export const DUR = {
  fast: 0.12,
  base: 0.18,
  slow: 0.24,
  /** Long enough for a count-up to feel deliberate. */
  countUp: 0.7
};

/* -------------------------------------------------------------------------- */
/* Variants                                                                    */
/* -------------------------------------------------------------------------- */

/** Opacity-only fade. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base, ease: EASE.out } }
};

/** Default page / panel entrance — fade + slight slide up. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE.out }
  }
};

/** Soft scale-up entrance for cards and tiles. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: DUR.base, ease: EASE.out }
  }
};

/** Slide in from the right (used by toasts). */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: DUR.base, ease: EASE.out }
  },
  exit: {
    opacity: 0,
    x: 24,
    transition: { duration: DUR.fast, ease: EASE.in }
  }
};

/** Build a parent variant that staggers its children. */
export const staggerParent = (staggerChildren = 0.04, delayChildren = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren, delayChildren }
  }
});

/* -------------------------------------------------------------------------- */
/* Reduced-motion aware wrapper                                                */
/* -------------------------------------------------------------------------- */

/**
 * Returns the same variants, but with all `hidden` states snapped to `show`
 * when the user has prefers-reduced-motion enabled. Use this for every
 * motion variant in the app so reduced motion is honored by default.
 */
export function useMotionVariants(variants: Variants): Variants {
  const reduced = usePrefersReducedMotion();
  return useMemo(() => {
    if (!reduced) return variants;
    // For reduced motion, every "hidden" state should equal "show" so
    // elements appear in their final position with no animation.
    const out: Variants = {};
    for (const key of Object.keys(variants)) {
      const v = variants[key];
      const target = (variants as Record<string, unknown>).show;
      out[key] =
        key === 'hidden' && target && typeof target === 'object'
          ? (target as Variants['show'])
          : v;
    }
    return out;
  }, [variants, reduced]);
}

/**
 * Returns `transition: { duration: 0 }` when reduced motion is on,
 * otherwise returns the supplied transition. Useful when you want
 * to compose your own variants inline.
 */
export function useTransition(transition: { duration: number; ease: [number, number, number, number] }) {
  const reduced = usePrefersReducedMotion();
  return reduced ? { duration: 0 } : transition;
}
