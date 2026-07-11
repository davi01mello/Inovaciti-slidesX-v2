import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { SortOrder, ViewMode } from '@/components/presentations/presentationFilters';

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'recentes', label: 'Recentes' },
  { value: 'nome', label: 'Nome' },
];

const VIEW_OPTIONS: { value: ViewMode; icon: 'grid' | 'list'; label: string }[] = [
  { value: 'grid', icon: 'grid', label: 'Ver em grade' },
  { value: 'list', icon: 'list', label: 'Ver em lista' },
];

interface PresentationsToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  sort: SortOrder;
  onSortChange: (sort: SortOrder) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  /** Quantos itens sobraram depois de busca + status (mostrado enquanto filtra). */
  resultCount: number;
  isFiltering: boolean;
}

export function PresentationsToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  resultCount,
  isFiltering,
}: PresentationsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex h-10 min-w-[220px] max-w-[360px] flex-1 items-center gap-2.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 transition-all duration-200 focus-within:border-brand/30 focus-within:bg-white/[0.05]">
        <Icon name="search" size={15} className="flex-none text-ink-muted" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por nome..."
          aria-label="Buscar apresentações por nome"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Limpar busca"
            className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/[0.06] text-[11px] text-ink-muted transition-colors duration-150 hover:bg-white/[0.12] hover:text-ink"
          >
            ✕
          </button>
        )}
      </div>

      {isFiltering && (
        <span className="text-[12px] font-medium tabular-nums text-ink-muted">
          {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
        </span>
      )}

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center rounded-full border border-white/[0.07] bg-white/[0.02] p-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSortChange(option.value)}
              aria-pressed={sort === option.value}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-150',
                sort === option.value
                  ? 'bg-white/[0.07] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'text-ink-muted hover:text-ink-secondary',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center rounded-full border border-white/[0.07] bg-white/[0.02] p-1">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onViewChange(option.value)}
              aria-pressed={view === option.value}
              aria-label={option.label}
              title={option.label}
              className={cn(
                'flex h-7 w-8 items-center justify-center rounded-full transition-all duration-150',
                view === option.value
                  ? 'bg-brand/[0.14] text-brand'
                  : 'text-ink-muted hover:text-ink-secondary',
              )}
            >
              <Icon name={option.icon} size={14} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
