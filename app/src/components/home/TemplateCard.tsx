import { useNavigate } from 'react-router-dom';
import { TemplateCardArt } from '@/components/home/TemplateCardArt';
import type { PresentationTemplate } from '@/types/template';

/**
 * Clicar usa o template de verdade: abre o wizard com a ideia pré-estruturada
 * e tamanho/estilo sugeridos (ver NovaPresentacaoPage, que lê location.state).
 */
export function TemplateCard({ template }: { template: PresentationTemplate }) {
  const navigate = useNavigate();

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
      className="group cursor-pointer transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[1/1.15] overflow-hidden rounded-[14px] border border-white/5 transition-all duration-300 group-hover:border-brand/30 group-hover:shadow-[0_0_0_1px_var(--color-brand-glow-soft),0_16px_32px_-16px_rgba(0,0,0,0.6)]">
        <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.05]">
          <TemplateCardArt template={template} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-2.5 opacity-0 transition-all duration-200 group-hover:opacity-100">
          <span className="glass rounded-full px-3 py-1 text-[10.5px] font-semibold text-ink">Usar template</span>
        </div>
      </div>
      <div className="mt-[9px]">
        <div className="text-xs font-semibold tracking-[-0.005em] text-ink transition-colors duration-200 group-hover:text-brand-glow">
          {template.name}
        </div>
        <div className="mt-px text-[11px] text-ink-muted">{template.tag}</div>
      </div>
    </div>
  );
}
