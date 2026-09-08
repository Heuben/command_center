/**
 * Toast — animated, accessible transient notifications.
 *
 *   <ToastViewport />  — place once near the app root (renders the
 *                        region + iterates the queue).
 *   useToast()        — push a new toast from anywhere in the tree.
 *
 * Animations honor `prefers-reduced-motion` via the `useMotionVariants`
 * hook. Auto-dismiss timer is managed in `ToastContext`.
 */
import React, { useEffect, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useToastContext } from '../../contexts/ToastContext';
import { slideInRight, useMotionVariants } from '../../lib/motion';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  duration: number;
  createdAt: number;
};

export type ToastOptions = {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** ms. 0 means "don't auto-dismiss". */
  duration?: number;
};

const toneIcon: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle
};

const toneAccent: Record<ToastTone, string> = {
  info: 'border-l-info text-info',
  success: 'border-l-success text-success',
  warning: 'border-l-warning text-warning',
  error: 'border-l-danger text-danger'
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const v = useMotionVariants(slideInRight);
  const Icon = toneIcon[toast.tone];
  const titleId = useId();
  const descId = useId();

  // Pause auto-dismiss on hover — if the user is reading, don't yank it.
  useEffect(() => {
    // (timer logic lives in the context; this is a no-op placeholder
    //  for a future enhancement that pauses on hover/focus)
  }, []);

  return (
    <motion.div
      layout
      variants={v}
      initial="hidden"
      animate="show"
      exit="exit"
      role="status"
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-labelledby={titleId}
      aria-describedby={toast.description ? descId : undefined}
      className={twMerge(
        'pointer-events-auto relative w-[min(360px,calc(100vw-2rem))]',
        'rounded-lg border border-line border-l-[3px] bg-elevated shadow-floating',
        'p-3 pr-8 text-sm text-ink',
        toneAccent[toast.tone]
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="h-4 w-4 mt-[2px] shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p id={titleId} className="font-semibold leading-snug">
            {toast.title}
          </p>
          {toast.description && (
            <p id={descId} className="mt-0.5 text-xs text-ink/70 leading-relaxed">
              {toast.description}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-ink/60 hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

export function ToastViewport() {
  const { toasts, dismiss } = useToastContext();
  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:bottom-4 sm:right-4 sm:top-auto sm:left-auto sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default ToastViewport;
