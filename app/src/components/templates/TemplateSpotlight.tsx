import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LiquidBlob } from '@/components/ui/LiquidBlob';
import { GOAL_OPTIONS, STYLE_OPTIONS } from '@/data/creationOptions';
import type { PresentationTemplate } from '@/types/template';

/** O ideaSkeleton com os [colchetes] virando chips: mostra exatamente o que
 * o usuário vai trocar quando o briefing abrir no wizard. */
function BriefingPreview({ skeleton }: { skeleton: string }) {
  const parts = skeleton.split(/(\[[^\]]*\])/g);
  return (
    <p className="m-0 text-[13px] leading-[1.9] text-ink-secondary">
      {parts.map((part, index) =>
        part.startsWith('[') && part.endsWith(']') ? (
          <mark
            key={index}
            className="mx-0.5 rounded-md border border-brand/25 bg-brand/[0.08] px-1.5 py-0.5 text-[12px] font-medium text-brand"
          >
            {part.slice(1, -1)}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

/**
 * Destaque editorial do topo da página: o primeiro template da categoria em
 * formato grande, com a bolha líquida viva e o briefing real que ele entrega.
 */
export function TemplateSpotlight({ template }: { template: PresentationTemplate }) {
  const navigate = useNavigate();
  const goal = GOAL_OPTIONS.find((o) => o.value === template.goal);
  const style = STYLE_OPTIONS.find((o) => o.value === template.style);

  return (
    <section className="relative overflow-hidden rounded-card border border-white/[0.06] bg-surface">
      {/* A escultura da casa, viva, sangrando pelo centro — o glass do painel
        * de briefing deixa o brilho dela atravessar. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-48 left-[34%]">
          <LiquidBlob size={340} variant={template.blob} />
        </div>
        <div className="absolute -right-24 -top-24 h-[260px] w-[420px] rounded-full bg-brand/[0.05] blur-[90px]" />
      </div>

      <div className="relative grid gap-6 p-7 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:p-9">
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/[0.08] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand">
              <Icon name="sparkles" size={11} />
              Destaque
            </span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {template.tag}
            </span>
          </div>

          <h2 className="m-0 mt-4 text-[30px] font-bold leading-[1.08] tracking-[-0.025em] text-ink">
            {template.name}
          </h2>
          <p className="mt-3 max-w-[440px] text-[14.5px] leading-[1.6] text-ink-secondary">{template.description}</p>

          <div className="mt-5 flex flex-wrap gap-1.5 text-[11px] font-medium text-ink-muted">
            {goal && (
              <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1">
                {goal.label} · {goal.outcome}
              </span>
            )}
            <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1">
              {template.slideCount} slides
            </span>
            {style && (
              <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1">
                Voz {style.label}
              </span>
            )}
          </div>

          <Button className="mt-7" onClick={() => navigate('/nova', { state: { templateId: template.id } })}>
            <Icon name="sparkles" size={14} />
            Usar este template
          </Button>
        </div>

        <div className="glass-deep flex flex-col self-center rounded-2xl p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              O briefing que já vem pronto
            </span>
            <Icon name="idea" size={14} className="text-brand/70" />
          </div>
          <BriefingPreview skeleton={template.ideaSkeleton} />
          <div className="mt-4 border-t border-white/[0.06] pt-3 text-[11.5px] text-ink-muted">
            Os <span className="font-medium text-brand/80">campos verdes</span> são o que você troca pelo seu
            contexto.
          </div>
        </div>
      </div>
    </section>
  );
}
