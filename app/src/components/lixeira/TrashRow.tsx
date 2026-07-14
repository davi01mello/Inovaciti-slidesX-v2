import { PresentationCardArt } from '@/components/home/PresentationCardArt';
import { Icon } from '@/components/ui/Icon';
import { TRASH_RETENTION_DAYS } from '@/stores/presentationsStore';
import { formatRelative } from '@/lib/time';
import { cn } from '@/lib/cn';
import type { Presentation } from '@/types/presentation';

/** Abaixo disso o prazo vira alerta (cores de perigo). */
const URGENT_DAYS = 5;

function daysLeft(deletedAt: number): number {
  const elapsed = Date.now() - deletedAt;
  return Math.max(0, TRASH_RETENTION_DAYS - Math.floor(elapsed / 86_400_000));
}

interface TrashRowProps {
  presentation: Presentation;
  onRestore: (presentation: Presentation) => void;
  onPurgeRequest: (presentation: Presentation) => void;
}

/**
 * Linha da Lixeira: miniatura, contexto e a barra de retenção — os 30 dias
 * escoando visualmente, verde enquanto há tempo, vermelha na reta final.
 */
export function TrashRow({ presentation, onRestore, onPurgeRequest }: TrashRowProps) {
  const remaining = presentation.deletedAt ? daysLeft(presentation.deletedAt) : TRASH_RETENTION_DAYS;
  const urgent = remaining <= URGENT_DAYS;
  const fraction = remaining / TRASH_RETENTION_DAYS;

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-white/[0.05] bg-surface px-4 py-3 transition-all duration-200 hover:border-white/[0.10] hover:bg-surface-2">
      <div className="w-[84px] flex-none overflow-hidden rounded-lg border border-white/[0.05] opacity-60 saturate-50 transition-all duration-300 group-hover:opacity-100 group-hover:saturate-100">
        <PresentationCardArt seed={presentation.id} title={presentation.title} height={46} compact />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold tracking-[-0.005em] text-ink">{presentation.title}</div>
        <div className="mt-0.5 text-[12px] text-ink-muted">
          {presentation.slides.length} {presentation.slides.length === 1 ? 'slide' : 'slides'} · movida{' '}
          {presentation.deletedAt ? formatRelative(presentation.deletedAt) : ''}
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <div className="h-1 w-[140px] overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                urgent ? 'bg-danger' : 'bg-brand/70',
              )}
              style={{ width: `${Math.max(4, fraction * 100)}%` }}
            />
          </div>
          <span className={cn('text-[11px] font-medium tabular-nums', urgent ? 'text-danger' : 'text-ink-muted')}>
            some em {remaining} {remaining === 1 ? 'dia' : 'dias'}
          </span>
        </div>
      </div>

      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          onClick={() => onRestore(presentation)}
          className="inline-flex items-center gap-2 rounded-control border border-brand/30 bg-brand/[0.08] px-3.5 py-2 text-[12.5px] font-semibold text-brand transition-all duration-150 hover:bg-brand/[0.14] hover:shadow-[0_0_18px_-6px_rgba(45,219,96,0.5)]"
        >
          <Icon name="restore" size={13} />
          Restaurar
        </button>
        <button
          type="button"
          onClick={() => onPurgeRequest(presentation)}
          className="rounded-control px-3.5 py-2 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
        >
          Excluir de vez
        </button>
      </div>
    </div>
  );
}
