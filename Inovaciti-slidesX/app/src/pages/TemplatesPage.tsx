/**
 * Galeria de templates em formato editorial: o primeiro da categoria vira o
 * destaque grande (com o briefing real que ele entrega) e o restante segue
 * em grade. A página é só composição: filtro, destaque e grade.
 */
import { useMemo, useState } from 'react';
import { TemplateSpotlight } from '@/components/templates/TemplateSpotlight';
import { TemplateGridCard } from '@/components/templates/TemplateGridCard';
import { TemplateCategoryFilter, type TemplateFilter } from '@/components/templates/TemplateCategoryFilter';
import { TEMPLATES } from '@/data/templates';

function countByCategory(): Record<TemplateFilter, number> {
  const counts = { todos: TEMPLATES.length, comercial: 0, institucional: 0, relatorios: 0, produto: 0, pessoas: 0 };
  for (const template of TEMPLATES) counts[template.category] += 1;
  return counts;
}

export function TemplatesPage() {
  const [filter, setFilter] = useState<TemplateFilter>('todos');

  const counts = useMemo(countByCategory, []);
  const visible = useMemo(
    () => (filter === 'todos' ? TEMPLATES : TEMPLATES.filter((t) => t.category === filter)),
    [filter],
  );
  const [spotlight, ...rest] = visible;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <span className="h-px w-6 bg-gradient-to-r from-brand to-transparent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Curadoria CITi</span>
          </div>
          <h1 className="m-0 text-[28px] font-semibold tracking-[-0.02em] text-ink">Templates</h1>
          <p className="mt-1 max-w-[520px] text-[14px] leading-[1.55] text-ink-muted">
            Pontos de partida curados pela CITi. Escolha um e o briefing já abre estruturado — troque os campos
            verdes pelo seu contexto e pronto.
          </p>
        </div>
        <TemplateCategoryFilter active={filter} counts={counts} onChange={setFilter} />
      </div>

      {/* key={filter} remonta destaque e grade a cada troca de categoria,
        * re-disparando a entrada escalonada. */}
      {spotlight && (
        <div key={`spot-${filter}`} className="animate-fade-up">
          <TemplateSpotlight template={spotlight} />
        </div>
      )}

      {rest.length > 0 && (
        <div key={`grid-${filter}`} className="grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-5">
          {rest.map((template, index) => (
            <div key={template.id} className="animate-fade-up" style={{ animationDelay: `${(index + 1) * 45}ms` }}>
              <TemplateGridCard template={template} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
