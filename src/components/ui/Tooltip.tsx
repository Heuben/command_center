/**
 * Tooltip — hover/focus-triggered tooltip with fade animation.
 *
 * Position: top (default), bottom, left, right.
 * Uses the existing CSS token system for colors — no new dependencies.
 */
import React, { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Position = 'top' | 'bottom' | 'left' | 'right';

type TooltipProps = {
  content: React.ReactNode;
  position?: Position;
  children: React.ReactElement;
};

const placement: Record<Position, { side: string; origin: string; animate: { opacity: number; y?: number; x?: number; scale: number } }> = {
  top: {
    side: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    origin: 'bottom center',
    animate: { opacity: 1, y: 0, scale: 1 }
  },
  bottom: {
    side: 'top-full left-1/2 -translate-x-1/2 mt-2',
    origin: 'top center',
    animate: { opacity: 1, y: 0, scale: 1 }
  },
  left: {
    side: 'right-full top-1/2 -translate-y-1/2 mr-2',
    origin: 'right center',
    animate: { opacity: 1, x: 0, scale: 1 }
  },
  right: {
    side: 'left-full top-1/2 -translate-y-1/2 ml-2',
    origin: 'left center',
    animate: { opacity: 1, x: 0, scale: 1 }
  }
};

const initial: Record<Position, { opacity: number; y?: number; x?: number; scale: number }> = {
  top: { opacity: 0, y: 4, scale: 0.95 },
  bottom: { opacity: 0, y: -4, scale: 0.95 },
  left: { opacity: 0, x: 4, scale: 0.95 },
  right: { opacity: 0, x: -4, scale: 0.95 }
};

export function Tooltip({ content, position = 'top', children }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}>
      {children}
      <AnimatePresence>
        {open && (
          <span
            id={id}
            role="tooltip"
            style={{ transformOrigin: placement[position].origin }}
            className={`pointer-events-none absolute z-[500] whitespace-nowrap ${placement[position].side}`}>
            <motion.span
              initial={initial[position] as { opacity: number; y?: number; x?: number; scale: number }}
              animate={placement[position].animate as { opacity: number; y?: number; x?: number; scale: number }}
              exit={initial[position] as { opacity: number; y?: number; x?: number; scale: number }}
              transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
              className="inline-block max-w-[220px] rounded-md border border-line bg-elevated px-2.5 py-1.5 shadow-panel">
              <span className="block text-[12px] leading-snug text-ink">{content}</span>
            </motion.span>
          </span>
        )}
      </AnimatePresence>
    </span>
  );
}
