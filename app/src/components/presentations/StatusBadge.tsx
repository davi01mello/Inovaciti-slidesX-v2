import { cn } from '@/lib/cn';
import type { PresentationStatus } from '@/types/presentation';

const STATUS_META: Record<PresentationStatus, { label: string; className: string }> = {
  ready: { label: 'Pronta', className: 'border-brand/25 bg-brand/[0.10] text-brand' },
  generating: { label: 'Gerando', className: 'border-brand/20 bg-brand/[0.05] text-brand-glow' },
  draft: { label: 'Rascunho', className: 'border-white/10 bg-black/40 text-ink-secondary' },
};

/** Chip de status usado no card da grade e na linha da lista — um só visual. */
export function StatusBadge({ status, className }: { status: PresentationStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]',
        meta.className,
        className,
      )}
    >
      {status === 'generating' && <span className="h-1 w-1 animate-pulse rounded-full bg-brand" />}
      {meta.label}
    </span>
  );
}
