import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import type { Alert } from '../../types';
import { confidenceDisplay } from '../../utils/labels';
import { formatClock } from '../../utils/time';

type Props = {
  alert: Alert;
  open: boolean;
  onClose: () => void;
};

/**
 * Full-screen evidence image viewer with backdrop blur, scaled entrance, and
 * Escape / backdrop-click dismissal. Rendered into a portal so it escapes any
 * overflow:hidden ancestor.
 */
export function EvidenceViewer({ alert, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const src = alert.snapshot_urls[0];
  if (!src) return null;

  return createPortal(
    <AnimatePresence>
      {open &&
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        onClick={onClose}>
          <div className="absolute inset-0 bg-slate-950/60" />

          <motion.div
          key="panel"
          role="dialog"
          aria-modal="true"
          aria-label="Evidence image"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 6 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-10 mx-4 max-h-[90vh] max-w-4xl w-full"
          onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[13px] font-semibold text-white/90">
                  Alert #{alert.id.replace('a-', '')} · Evidence
                </h2>
                <p className="text-[12px] text-white/50">{alert.address}</p>
              </div>
              <button
              onClick={onClose}
              aria-label="Close evidence viewer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors duration-150 hover:bg-white/20 hover:text-white">
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 shadow-2xl">
              <img
              src={src}
              alt={`Auto-captured evidence frame for alert ${alert.id.replace('a-', '')}`}
              className="max-h-[72vh] w-full object-contain"
              style={{ display: 'block' }} />
            
            </div>

            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              {[
            { label: 'Captured', value: formatClock(alert.created_at) },
            {
              label: 'Trigger',
              value: alert.source === 'edge_imu' ? 'IMU Collision' : 'Vision Model'
            },
            { label: 'Confidence', value: confidenceDisplay(alert.confidence_level) },
            {
              label: 'GPS',
              value: `${alert.location.lat.toFixed(4)}, ${alert.location.lng.toFixed(4)}`
            }].
            map((item) =>
            <p key={item.label} className="text-[12px] text-white/50">
                  <span className="text-white/30">{item.label}: </span>
                  <span className="font-medium text-white/70">{item.value}</span>
                </p>
            )}
            </div>

            <p className="mt-1 text-center text-[11px] text-white/25">
              Press <kbd className="rounded border border-white/20 px-1 font-mono">Esc</kbd> or click
              outside to close
            </p>
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>,
    document.body
  );
}