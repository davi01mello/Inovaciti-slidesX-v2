import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeToasts, type Toast } from '@/lib/toast';

const AUTO_DISMISS_MS = 4200;

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
      const timer = window.setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
      timersRef.current.set(toast.id, timer);
    });
    const timers = timersRef.current;
    return () => {
      unsubscribe();
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="glass-deep pointer-events-auto flex animate-slide-in items-center gap-3 rounded-2xl py-3 pl-4 pr-2 text-[13px] text-ink"
        >
          {toast.message}
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Fechar aviso"
            className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-ink"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
