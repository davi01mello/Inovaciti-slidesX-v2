import { useEffect, useRef, useState } from 'react';
import { formatRelative } from '@/lib/time';
import { cn } from '@/lib/cn';

interface AutosaveIndicatorProps {
  updatedAt: number;
}

/**
 * Reflete o autosave real: o presentationsStore persiste no localStorage a cada mudança,
 * então todo updatedAt novo é um save concluído. O ponto pisca quando acabou de salvar.
 */
export function AutosaveIndicator({ updatedAt }: AutosaveIndicatorProps) {
  const [, setTick] = useState(0);
  const [justSaved, setJustSaved] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setJustSaved(true);
    const timeout = window.setTimeout(() => setJustSaved(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [updatedAt]);

  return (
    <div className="inline-flex flex-none items-center gap-2 text-[12px] text-ink-muted" title="Salvo automaticamente neste navegador">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full bg-brand transition-all duration-300',
          justSaved ? 'scale-150 shadow-[0_0_12px_rgba(45,219,96,0.9)]' : 'shadow-[0_0_8px_rgba(45,219,96,0.6)]',
        )}
      />
      Salvo {formatRelative(updatedAt)}
    </div>
  );
}
