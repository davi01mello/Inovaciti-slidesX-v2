/**
 * Passo 2, "Direção": pra que serve, pra quem, com que voz.
 *
 * Substitui o antigo passo "Qual é o clima?", que capturava só o tom e não
 * mexia na narrativa. O que de fato decide como a história é contada é o
 * OBJETIVO: a mesma ideia vira decks opostos se o fim for convencer ou capacitar.
 * O público entrou porque era o contexto mais valioso que o fluxo não pedia. O
 * tom continua aqui, mas no lugar certo: como modulador do objetivo, não como
 * uma página inteira sozinha.
 */
import { GOAL_OPTIONS, AUDIENCE_EXAMPLES, STYLE_OPTIONS } from '@/data/creationOptions';
import { OptionCard } from '@/components/creation/OptionCard';
import { StepHeader } from '@/components/creation/StepHeader';
import { StylePreview } from '@/components/creation/StylePreview';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { PresentationGoal, VisualStyle } from '@/types/creation';

/** Teto do campo de público. Espelha a validação da API (200 caracteres). */
const AUDIENCE_MAX = 200;

interface StepDirectionProps {
  goal: PresentationGoal | null;
  audience: string;
  style: VisualStyle | null;
  onGoalChange: (goal: PresentationGoal) => void;
  onAudienceChange: (audience: string) => void;
  onStyleChange: (style: VisualStyle) => void;
}

export function StepDirection({
  goal,
  audience,
  style,
  onGoalChange,
  onAudienceChange,
  onStyleChange,
}: StepDirectionProps) {
  return (
    <div>
      <StepHeader
        kicker="Direção"
        title="O que essa apresentação precisa conquistar?"
        subtitle="É daqui que sai a narrativa. A mesma ideia vira um deck bem diferente se o fim for fechar negócio ou ensinar alguém."
      />

      <div role="radiogroup" aria-label="Objetivo da apresentação" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {GOAL_OPTIONS.map((option) => {
          const selected = goal === option.value;
          return (
            <OptionCard key={option.value} selected={selected} onSelect={() => onGoalChange(option.value)}>
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-300',
                  selected
                    ? 'border-brand/40 bg-brand/[0.14] text-brand'
                    : 'border-white/[0.08] bg-white/[0.03] text-ink-muted',
                )}
              >
                <Icon name={option.icon} size={18} />
              </div>
              <div className="mt-4 text-[18px] font-semibold tracking-[-0.01em] text-ink">{option.label}</div>
              <div
                className={cn(
                  'mt-1 text-[12.5px] font-medium transition-colors duration-300',
                  selected ? 'text-brand' : 'text-ink-muted',
                )}
              >
                {option.outcome}
              </div>
              <p className="mt-3 text-[13px] leading-[1.55] text-ink-secondary">{option.description}</p>
            </OptionCard>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        {/* Público: opcional de propósito. Quem sabe pra quem fala escreve em cinco
            segundos, e quem não sabe não trava o fluxo. Vazio, a IA deduz da ideia. */}
        <section className="rounded-2xl border border-white/[0.05] bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-ink">Quem vai assistir?</h3>
            <span className="text-[11.5px] text-ink-muted">Opcional</span>
          </div>
          <p className="mb-0 mt-1 text-[12.5px] leading-[1.5] text-ink-muted">
            Isso ajusta o nível técnico e as referências do texto.
          </p>

          <input
            type="text"
            value={audience}
            maxLength={AUDIENCE_MAX}
            onChange={(event) => onAudienceChange(event.target.value)}
            placeholder="Ex.: diretoria de uma varejista"
            aria-label="Público da apresentação"
            className="mt-4 w-full rounded-control border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors duration-200 placeholder:text-ink-muted/70 focus:border-brand/40"
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {AUDIENCE_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onAudienceChange(example)}
                className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[11.5px] text-ink-muted transition-colors duration-150 hover:border-brand/30 hover:text-ink-secondary"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        {/* Tom: modulador, não protagonista. Três cartões compactos com o preview real. */}
        <section className="rounded-2xl border border-white/[0.05] bg-surface p-5">
          <h3 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-ink">Com que voz?</h3>
          <p className="mb-0 mt-1 text-[12.5px] leading-[1.5] text-ink-muted">
            O quanto o slide respira e o peso das frases.
          </p>

          <div role="radiogroup" aria-label="Tom da escrita" className="mt-4 grid gap-3 sm:grid-cols-3">
            {STYLE_OPTIONS.map((option) => {
              const selected = style === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onStyleChange(option.value)}
                  className={cn(
                    'group rounded-xl border p-2.5 text-left transition-all duration-200',
                    selected
                      ? 'border-brand/45 bg-brand/[0.07]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]',
                  )}
                >
                  <StylePreview
                    style={option.value}
                    className="transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="text-[13.5px] font-semibold text-ink">{option.label}</span>
                    {selected && <Icon name="check" size={12} strokeWidth={2.6} className="text-brand" />}
                  </div>
                  <p className="mb-0 mt-0.5 text-[11.5px] leading-[1.45] text-ink-muted">{option.description}</p>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
