/**
 * useCountUp — animate a number from 0 → target over a duration.
 *
 * Returns the current integer/float value. Respects prefers-reduced-motion
 * (returns the target immediately in that case).
 */
import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { DUR } from '../lib/motion';

type Options = {
  duration?: number;
  /** Decimal places to round to. */
  precision?: number;
  /** Delay before animation starts (ms). */
  delay?: number;
};

export function useCountUp(target: number, options: Options = {}): number {
  const { duration = DUR.countUp, precision = 0, delay = 0 } = options;
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    let raf: number;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Number((eased * target).toFixed(precision)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, delay * 1000);
    return () => {
      clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration, precision, delay, reduced]);

  return value;
}
