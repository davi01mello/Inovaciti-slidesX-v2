import { useNavigate } from 'react-router-dom';
import { TemplateCardArt } from '@/components/home/TemplateCardArt';
import { Icon } from '@/components/ui/Icon';
import { GOAL_OPTIONS, STYLE_OPTIONS } from '@/data/creationOptions';
import type { PresentationTemplate } from '@/types/template';

/**
 * Card da grade de templates. O card inteiro é o botão (sem interativo
 * aninhado): clicar em qualquer ponto abre o wizard já estruturado.
 */
export function TemplateGridCard({ template }: { template: PresentationTemplate }) {
  const navigate = useNavigate();
  const goal = GOAL_OPTIONS.find((o) => o.value === template.goal);
  const style = STYLE_OPTIONS.find((o) => o.value === template.style);

  function applyTemplate() {
    navigate('/nova', { state: { templateId: template.id } });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={applyTemplate}
      onKeyDown={(event) => {
        if (event.key === 'Enter') applyTemplate();
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-card border border-white/5 bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_0_0_1px_var(--color-brand-glow-soft),0_24px_48px_-20px_rgba(0,0,0,0.7),0_8px_24px_-12px_rgba(45,219,96,0.2)]"
    >
      <div className="relative aspect-video overflow-hidden">
        <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]">
          <TemplateCardArt template={template} />
        </div>
        {/* Véu de brilho no hover, o mesmo gesto dos cards de apresentação. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
          }}
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink transition-colors duration-200 group-hover:text-brand-glow">
          {template.name}
        </div>
        <p className="mb-0 mt-1.5 line-clamp-2 text-[12.5px] leading-[1.5] text-ink-muted">{template.description}</p>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[10.5px] font-medium text-ink-muted">
          {goal && (
            <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5">{goal.label}</span>
          )}
          <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5">
            {template.slideCount} slides
          </span>
          {style && (
            <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5">
              Voz {style.label}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-brand/80 transition-colors duration-200 group-hover:text-brand">
            <Icon name="sparkles" size={13} />
            Usar este template
          </span>
          <Icon
            name="chevron-right"
            size={13}
            className="text-ink-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand"
          />
        </div>
      </div>
    </div>
  );
}
