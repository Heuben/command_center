/**
 * ToastContext — provider that owns the in-memory toast queue.
 *
 * The visual layer (animation, layout, dismiss buttons) lives in
 * `Toast.tsx`. This context just exposes a tiny push/dismiss/clear API
 * and the current list of toasts. It's wired into the app via
 * `<ToastProvider>` in AppLayout so every page can use `useToast()`.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react';
import type { Toast, ToastOptions } from '../components/ui/Toast';

type Ctx = {
  toasts: Toast[];
  push: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Refs let us reach the live setState even from inside a setTimeout
  // queued earlier (avoids stale-closure issues with the auto-dismiss
  // timer when many toasts are pushed in quick succession).
  const toastsRef = useRef<Toast[]>([]);
  toastsRef.current = toasts;
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clear = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    setToasts([]);
  }, []);

  const push = useCallback(
    (options: ToastOptions): string => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const tone = options.tone ?? 'info';
      const duration = options.duration ?? 4500;
      const next: Toast = {
        id,
        tone,
        title: options.title,
        description: options.description,
        duration,
        createdAt: Date.now()
      };
      setToasts((prev) => [...prev, next]);
      if (duration > 0) {
        const handle = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, handle);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo<Ctx>(
    () => ({ toasts, push, dismiss, clear }),
    [toasts, push, dismiss, clear]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToastContext(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToastContext must be used inside <ToastProvider>');
  }
  return ctx;
}
