import { motion } from 'motion/react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { StatusCounts, StatusFilter } from '@/components/presentations/presentationFilters';

interface TileSpec {
  value: StatusFilter;
  label: string;
  hint: string;
  icon: IconName;
}

const TILES: TileSpec[] = [
  { value: 'todas', label: 'Todas', hint: 'A biblioteca inteira', icon: 'presentations' },
  { value: 'ready', label: 'Prontas', hint: 'Prontas pra apresentar', icon: 'check' },
  { value: 'draft', label: 'Rascunhos', hint: 'Ainda em construção', icon: 'edit' },
  { value: 'generating', label: 'Gerando', hint: 'A IA está trabalhando', icon: 'sparkles' },
];

interface StatusTilesProps {
  counts: StatusCounts;
  active: StatusFilter;
  onChange: (status: StatusFilter) => void;
}

/**
 * Visão geral da biblioteca que também É o filtro de status: cada tile mostra
 * a contagem e um clique filtra a listagem. "Gerando" só aparece enquanto
 * existe geração em andamento (estado transitório).
 */
export function StatusTiles({ counts, active, onChange }: StatusTilesProps) {
  const tiles = TILES.filter((t) => t.value !== 'generating' || counts.generating > 0);

  return (
    <div role="radiogroup" aria-label="Filtrar por status" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => {
        const selected = active === tile.value;
        const count = counts[tile.value];
        return (
          <button
            key={tile.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(tile.value)}
            className={cn(
              'group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 focus:outline-none',
              selected
                ? 'border-brand/40 bg-brand/[0.06] shadow-[0_0_0_1px_rgba(45,219,96,0.22)]'
                : 'border-white/[0.06] bg-surface hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-surface-2',
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 flex-none items-center justify-center rounded-xl border transition-colors duration-200',
                selected
                  ? 'border-brand/40 bg-brand/15 text-brand'
                  : 'border-white/[0.07] bg-white/[0.03] text-ink-muted group-hover:text-ink-secondary',
              )}
            >
              <Icon name={tile.icon} size={17} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className={cn('text-[20px] font-bold tabular-nums tracking-[-0.02em]', selected ? 'text-brand' : 'text-ink')}>
                  {count}
                </span>
                <span className="text-[13px] font-semibold text-ink">{tile.label}</span>
              </div>
              <div className="truncate text-[11.5px] text-ink-muted">{tile.hint}</div>
            </div>
            {selected && (
              <motion.span
                layoutId="status-tile-glow"
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand/[0.10] blur-2xl"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
