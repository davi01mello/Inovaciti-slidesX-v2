import type { ReactNode } from 'react';
import { StepHeader } from '@/components/creation/StepHeader';
import { StylePreview } from '@/components/creation/StepStyle';
import { SIZE_OPTIONS, STYLE_OPTIONS } from '@/data/creationOptions';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { CreationDraft } from '@/types/creation';

interface StepSummaryProps {
  draft: CreationDraft;
  /** Pula direto pro passo correspondente ao card clicado. */
  onEdit: (step: number) => void;
}

/** Quantos anexos listar antes de resumir em "+N". */
const MAX_VISIBLE_ASSETS = 3;

function SummaryCard({
  label,
  step,
  onEdit,
  className,
  children,
}: {
  label: string;
  step: number;
  onEdit: (step: number) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'group/card flex min-w-0 flex-col rounded-2xl border border-white/[0.05] bg-surface transition-colors duration-200 hover:border-white/[0.09]',
        className,
      )}
    >
      <div className="flex flex-none items-center justify-between border-b border-white/[0.05] py-2 pl-5 pr-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</span>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-muted opacity-60 transition-all duration-150 hover:bg-brand/[0.08] hover:text-brand group-hover/card:opacity-100"
        >
          <Icon name="edit" size={12} />
          Editar
        </button>
      </div>
      {children}
    </section>
  );
}

export function StepSummary({ draft, onEdit }: StepSummaryProps) {
  const size = SIZE_OPTIONS.find((o) => o.value === draft.size);
  const style = STYLE_OPTIONS.find((o) => o.value === draft.style);
  const idea = draft.idea.trim();
  const hiddenAssets = draft.assets.length - MAX_VISIBLE_ASSETS;

  return (
    <div>
      <StepHeader
        kicker="Confirmação"
        title="Vamos nessa?"
        subtitle="É isso que vou usar de base. Você ainda pode ajustar tudo dentro do workspace."
      />

      <div className="mt-7 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        {/* A ideia pode ter qualquer tamanho: o texto quebra palavra a palavra e
          * rola dentro do card — nunca estoura o espaço delimitado. No desktop o
          * card é absoluto dentro da célula, então a altura da linha do grid é
          * ditada só pela coluna da direita e as duas colunas ficam iguais. */}
        <div className="relative min-w-0">
          <SummaryCard label="Ideia" step={1} onEdit={onEdit} className="lg:absolute lg:inset-0">
            <div className="max-h-[34vh] min-h-0 flex-1 overflow-y-auto px-5 py-4 lg:max-h-none">
              <p className="m-0 whitespace-pre-wrap break-words text-[14px] leading-[1.65] text-ink">
                {idea || <span className="text-ink-muted">(vazio)</span>}
              </p>
            </div>
            <div className="flex flex-none items-center justify-between border-t border-white/[0.05] px-5 py-2.5 text-[11.5px] text-ink-muted">
              <span className="tabular-nums">{idea.length} caracteres</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-brand">
                <Icon name="check" size={11} strokeWidth={2.4} />
                Briefing pronto
              </span>
            </div>
          </SummaryCard>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SummaryCard label="Contexto" step={2} onEdit={onEdit}>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-ink">{size?.label ?? '—'}</div>
                <div className="mt-0.5 text-[12.5px] text-ink-muted">{size?.hint ?? 'Nenhum contexto escolhido'}</div>
              </div>
              {size && (
                <div aria-hidden="true" className="flex flex-none items-end gap-[3px]">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className="w-2.5 rounded-[2px] bg-brand/30"
                      style={{ height: `${18 - i * 2}px` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </SummaryCard>

          <SummaryCard label="Estilo" step={3} onEdit={onEdit}>
            <div className="flex items-center gap-4 px-5 py-4">
              {draft.style && (
                // Swatch em meia escala: reusa o preview do passo 3 pixel a pixel.
                <div className="relative h-[76px] w-[135px] flex-none overflow-hidden rounded-lg">
                  <div className="absolute left-0 top-0 w-[270px] origin-top-left scale-50">
                    <StylePreview style={draft.style} className="rounded-xl" />
                  </div>
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-ink">{style?.label ?? '—'}</div>
                <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-[1.5] text-ink-muted">
                  {style?.description ?? 'Nenhum estilo escolhido'}
                </div>
              </div>
            </div>
          </SummaryCard>

          <SummaryCard label="Anexos" step={4} onEdit={onEdit}>
            <div className="px-5 py-4">
              {draft.assets.length === 0 ? (
                <div className="text-[13px] text-ink-muted">Nenhum arquivo — sem problema.</div>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {draft.assets.slice(0, MAX_VISIBLE_ASSETS).map((asset) => (
                    <li key={asset.id} className="flex min-w-0 items-center gap-2 text-[13px] text-ink">
                      <Icon
                        name={asset.kind === 'pdf' ? 'file-pdf' : asset.kind === 'logo' ? 'brand' : 'file-image'}
                        size={13}
                        className="flex-none text-ink-muted"
                      />
                      <span className="truncate">{asset.name}</span>
                      <span className="flex-none text-[11.5px] text-ink-muted">{asset.sizeLabel}</span>
                    </li>
                  ))}
                  {hiddenAssets > 0 && (
                    <li className="text-[12px] font-medium text-ink-muted">
                      +{hiddenAssets} {hiddenAssets === 1 ? 'outro arquivo' : 'outros arquivos'}
                    </li>
                  )}
                </ul>
              )}
            </div>
          </SummaryCard>
        </div>
      </div>
    </div>
  );
}
