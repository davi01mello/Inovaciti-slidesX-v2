import { cn } from '@/lib/cn';
import { TEMPLATE_CATEGORY_LABEL, type TemplateCategory } from '@/types/template';

export type TemplateFilter = TemplateCategory | 'todos';

interface TemplateCategoryFilterProps {
  active: TemplateFilter;
  counts: Record<TemplateFilter, number>;
  onChange: (filter: TemplateFilter) => void;
}

const FILTERS: { value: TemplateFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  ...(Object.entries(TEMPLATE_CATEGORY_LABEL) as [TemplateCategory, string][]).map(([value, label]) => ({
    value,
    label,
  })),
];

/** Chips de categoria com contagem — o mesmo desenho segmentado do resto do app. */
export function TemplateCategoryFilter({ active, counts, onChange }: TemplateCategoryFilterProps) {
  return (
    <div role="radiogroup" aria-label="Filtrar templates por categoria" className="flex flex-wrap items-center gap-1.5">
      {FILTERS.map((filter) => {
        const selected = active === filter.value;
        return (
          <button
            key={filter.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(filter.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all duration-150',
              selected
                ? 'border-brand/35 bg-brand/[0.10] text-brand'
                : 'border-white/[0.07] bg-white/[0.02] text-ink-secondary hover:border-white/[0.14] hover:text-ink',
            )}
          >
            {filter.label}
            <span
              className={cn(
                'rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums',
                selected ? 'bg-brand/15 text-brand' : 'bg-white/[0.05] text-ink-muted',
              )}
            >
              {counts[filter.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
