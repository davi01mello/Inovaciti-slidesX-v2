/**
 * Passo 5, "Revisão": a última chance de conferir antes da IA trabalhar.
 *
 * A regra da página: cada card mostra o que a IA vai de fato receber, e leva de
 * volta ao passo que o gerou. Nada de selo decorativo dizendo que está tudo
 * certo, isso não é informação, é enfeite.
 */
import type { ReactNode } from 'react';
import { StepHeader } from '@/components/creation/StepHeader';
import { StylePreview } from '@/components/creation/StylePreview';
import { GOAL_OPTIONS, STYLE_OPTIONS } from '@/data/creationOptions';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { composeDeck, estimateSpeakingTime, formOf, formatSpeakingTime } from '@/lib/slidePlan';
import type { CreationDraft } from '@/types/creation';

interface StepSummaryProps {
  draft: CreationDraft;
  /** Pula direto pro passo correspondente ao card clicado. */
  onEdit: (step: number) => void;
}

/** Quantos anexos listar antes de resumir em "mais N". */
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
  const goal = GOAL_OPTIONS.find((o) => o.value === draft.goal);
  const style = STYLE_OPTIONS.find((o) => o.value === draft.style);
  const idea = draft.idea.trim();
  const audience = draft.audience.trim();
  const hiddenAssets = draft.assets.length - MAX_VISIBLE_ASSETS;

  const form = formOf(draft.slideCount);
  const deck = composeDeck(draft.slideCount);
  const time = estimateSpeakingTime(draft.slideCount);

  return (
    <div>
      <StepHeader
        kicker="Revisão"
        title="Vamos nessa?"
        subtitle="É exatamente isso que a IA vai receber. Depois de gerar, tudo continua editável dentro do workspace."
      />

      <div className="mt-7 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        {/* A ideia pode ter qualquer tamanho: o texto quebra palavra a palavra e
          * rola dentro do card, nunca estoura o espaço. No desktop o card é
          * absoluto dentro da célula, então a altura da linha do grid é ditada só
          * pela coluna da direita e as duas colunas ficam iguais. */}
        <div className="relative min-w-0">
          <SummaryCard label="Ideia" step={1} onEdit={onEdit} className="lg:absolute lg:inset-0">
            <div className="max-h-[34vh] min-h-0 flex-1 overflow-y-auto px-5 py-4 lg:max-h-none">
              <p className="m-0 whitespace-pre-wrap break-words text-[14px] leading-[1.65] text-ink">
                {idea || <span className="text-ink-muted">(vazio)</span>}
              </p>
            </div>
            <div className="flex flex-none items-center gap-2 border-t border-white/[0.05] px-5 py-2.5 text-[11.5px] text-ink-muted">
              <span className="tabular-nums">{idea.length} caracteres de briefing</span>
            </div>
          </SummaryCard>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SummaryCard label="Direção" step={2} onEdit={onEdit}>
            <div className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-center gap-3">
                {goal && (
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-brand/35 bg-brand/[0.1] text-brand">
                    <Icon name={goal.icon} size={16} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-ink">{goal?.label ?? 'Sem objetivo'}</div>
                  <div className="mt-0.5 truncate text-[12.5px] text-ink-muted">
                    {goal?.outcome ?? 'Escolha o que a apresentação precisa conquistar'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-white/[0.05] pt-3 text-[12.5px]">
                <span className="flex-none text-ink-muted">Público:</span>
                <span className="truncate text-ink-secondary">
                  {audience || 'a IA deduz pela ideia'}
                </span>
              </div>

              {style && (
                <div className="flex items-center gap-3 border-t border-white/[0.05] pt-3">
                  {/* Swatch em meia escala: reusa o preview do passo 2 pixel a pixel. */}
                  <div className="relative h-[42px] w-[75px] flex-none overflow-hidden rounded-md">
                    <div className="absolute left-0 top-0 w-[270px] origin-top-left scale-[0.278]">
                      <StylePreview style={style.value} className="rounded-lg" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-ink">Voz {style.label.toLowerCase()}</div>
                    <div className="mt-0.5 line-clamp-1 text-[12px] text-ink-muted">{style.description}</div>
                  </div>
                </div>
              )}
            </div>
          </SummaryCard>

          <SummaryCard label="Extensão" step={3} onEdit={onEdit}>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              {/* Os nomes das formas têm gêneros diferentes ("Cartaz", "Clássica"),
                  então o rótulo vive sozinho em vez de virar "formato clássica". */}
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-ink">
                  <span className="tabular-nums">{draft.slideCount}</span>{' '}
                  {draft.slideCount === 1 ? 'slide' : 'slides'} · {form.label}
                </div>
                <div className="mt-0.5 text-[12.5px] text-ink-muted">
                  {deck.sections > 0
                    ? `${deck.content} de conteúdo em ${deck.sections} ${deck.sections === 1 ? 'capítulo' : 'capítulos'}, ${formatSpeakingTime(time)}`
                    : formatSpeakingTime(time)}
                </div>
              </div>
              <div aria-hidden="true" className="flex flex-none items-end gap-[3px]">
                {Array.from({ length: Math.min(6, draft.slideCount) }, (_, i) => (
                  <span
                    key={i}
                    className={cn('w-2 rounded-[2px]', i === 0 ? 'bg-brand' : 'bg-brand/25')}
                    style={{ height: `${20 - i * 2}px` }}
                  />
                ))}
              </div>
            </div>
          </SummaryCard>

          <SummaryCard label="Anexos" step={4} onEdit={onEdit}>
            <div className="px-5 py-4">
              {draft.assets.length === 0 ? (
                <div className="text-[13px] text-ink-muted">Nenhum arquivo anexado, e tudo bem.</div>
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
                      mais {hiddenAssets} {hiddenAssets === 1 ? 'arquivo' : 'arquivos'}
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
