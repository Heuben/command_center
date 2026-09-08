/**
 * Tooltip — hover/focus-triggered tooltip with fade animation.
 *
 * Position: top (default), bottom, left, right.
 * Uses the existing CSS token system for colors — no new dependencies.
 */
import React, { useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

type Position = 'top' | 'bottom' | 'left' | 'right';

type TooltipProps = {
  content: React.ReactNode;
  position?: Position;
  children: React.ReactElement;
};

const placement: Record<Position, { side: string; origin: string; animate: { opacity: number; y?: number; x?: number; scale: number } }> = {
  top: {
    side: 'bottom-0 left-1/2 -translate-x-1/2 mb-2',
    origin: 'bottom center',
    animate: { opacity: 1, y: 0, scale: 1 }
  },
  bottom: {
    side: 'top-0 left-1/2 -translate-x-1/2 mt-2',
    origin: 'top center',
    animate: { opacity: 1, y: 0, scale: 1 }
  },
  left: {
    side: 'right-0 top-1/2 -translate-y-1/2 mr-2',
    origin: 'right center',
    animate: { opacity: 1, x: 0, scale: 1 }
  },
  right: {
    side: 'left-0 top-1/2 -translate-y-1/2 ml-2',
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
  const triggerRef = useRef<HTMLElement>(null);

  return (
    <>
      {React.cloneElement(children, {
        ref: triggerRef,
        'aria-describedby': open ? id : undefined,
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
        onFocus: () => setOpen(true),
        onBlur: () => setOpen(false)
      })}
      {createPortal(
        <AnimatePresence>
          {open && (
            <div
              id={id}
              role="tooltip"
              style={{ transformOrigin: placement[position].origin }}
              className={`pointer-events-none fixed z-[500] ${placement[position].side}`}>
              <motion.div
                initial={initial[position] as { opacity: number; y?: number; x?: number; scale: number }}
                animate={placement[position].animate as { opacity: number; y?: number; x?: number; scale: number }}
                exit={initial[position] as { opacity: number; y?: number; x?: number; scale: number }}
                transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
                className="max-w-[220px] rounded-md border border-line bg-elevated px-2.5 py-1.5 shadow-panel">
                <p className="text-[12px] leading-snug text-ink">{content}</p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
