import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: 'md' | 'lg';
};

export function Modal({ open, onClose, title, subtitle, footer, children, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto scrollbar-none p-4 sm:p-8">
          <motion.div
          className="fixed inset-0 bg-slate-950/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          onClick={onClose} />
        

          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 4 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className={twMerge(
            'relative z-10 my-auto w-full overflow-hidden rounded-xl border border-line bg-elevated shadow-panel',
            size === 'lg' ? 'max-w-3xl' : 'max-w-xl'
          )}>
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>}
              </div>
              <button
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 rounded-md p-1.5 text-ink-muted transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-ink">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto scrollbar-none px-5 py-4">{children}</div>
            {footer &&
          <div className="flex items-center justify-end gap-2 border-t border-line bg-ink/[0.02] px-5 py-3">
                {footer}
              </div>
          }
          </motion.div>
        </div>
      }
    </AnimatePresence>,
    document.body
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children
}: Omit<Props, 'footer' | 'size'>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50">
          <motion.div
          className="absolute inset-0 bg-slate-950/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          onClick={onClose} />
        

          <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-line bg-elevated shadow-panel">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>}
              </div>
              <button
              onClick={onClose}
              aria-label="Close panel"
              className="-mr-1 rounded-md p-1.5 text-ink-muted transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-ink">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-none px-5 py-4">{children}</div>
          </motion.aside>
        </div>
      }
    </AnimatePresence>,
    document.body
  );
}