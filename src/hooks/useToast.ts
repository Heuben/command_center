/**
 * useToast — imperative API around the toast queue.
 *
 * The actual provider lives in `ToastContext`. This hook just exposes a
 * stable `toast()` function plus a couple of semantic shortcuts. Always
 * render `<ToastProvider>` (or its alias `ToastViewport`) once near the
 * root — see AppLayout.
 */
import { useCallback, useMemo } from 'react';
import { useToastContext } from '../contexts/ToastContext';
import type { Toast, ToastOptions, ToastTone } from '../components/ui/Toast';

type ToastFn = (options: ToastOptions) => string;
type ToneFn = (title: string, opts?: Partial<ToastOptions>) => string;

export function useToast() {
  const ctx = useToastContext();

  const toast = useCallback<ToastFn>(
    (options) => ctx.push(options),
    [ctx]
  );

  const success = useCallback<ToneFn>(
    (title, opts = {}) => ctx.push({ tone: 'success', title, ...opts }),
    [ctx]
  );
  const error = useCallback<ToneFn>(
    (title, opts = {}) => ctx.push({ tone: 'error', title, ...opts }),
    [ctx]
  );
  const info = useCallback<ToneFn>(
    (title, opts = {}) => ctx.push({ tone: 'info', title, ...opts }),
    [ctx]
  );
  const warning = useCallback<ToneFn>(
    (title, opts = {}) => ctx.push({ tone: 'warning', title, ...opts }),
    [ctx]
  );

  return useMemo(
    () => ({
      toast,
      success,
      error,
      info,
      warning,
      dismiss: (id: string) => ctx.dismiss(id),
      clear: () => ctx.clear()
    }),
    [toast, success, error, info, warning, ctx]
  );
}

export type { Toast, ToastOptions, ToastTone };
