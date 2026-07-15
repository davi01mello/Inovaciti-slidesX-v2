/**
 * Passo 2, "Direção": pra que serve, pra quem, com que voz e com que cor.
 *
 * A versão anterior estava carregada: cada objetivo trazia um parágrafo de
 * descrição, e o resto empilhava blocos sem um ritmo comum. Aqui a página é uma
 * GRADE de dois andares, e cada peça diz só o essencial:
 *
 *   andar de cima   os 4 objetivos, em cartões iguais e enxutos (rótulo + o que
 *                   a sala faz no fim). O parágrafo longo saiu: quem escolhe um
 *                   objetivo já sabe o que ele é.
 *   andar de baixo  três colunas simétricas — Público · Voz · Cor. A Cor é a
 *                   barra de tom com as três capas ao vivo: a decisão mais visual
 *                   do fluxo fica à vista, não escondida atrás de um nome.
 *
 * Tudo cabe na viewport, sem rolagem até o botão de continuar.
 */
import { GOAL_OPTIONS, AUDIENCE_EXAMPLES, STYLE_OPTIONS } from '@/data/creationOptions';
import { StepHeader } from '@/components/creation/StepHeader';
import { ToneBar } from '@/components/creation/ToneBar';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { PresentationGoal, VisualStyle } from '@/types/creation';

/** Teto do campo de público. Espelha a validação da API (200 caracteres). */
const AUDIENCE_MAX = 200;

/**
 * A "cara" de cada voz num selo minúsculo que NÃO quebra em tamanho pequeno: barras
 * relativas dentro de uma caixa fixa, sem alturas que estouram. Mostra a densidade
 * real de cada voz — Sereno quase vazio, Preciso com tópicos, Presença uma manchete.
 */
function VoicePreview({ style, active }: { style: VisualStyle; active: boolean }) {
  const accent = active ? 'bg-brand' : 'bg-brand/55';
  const line = active ? 'bg-white/80' : 'bg-white/45';
  const faint = active ? 'bg-white/30' : 'bg-white/[0.18]';
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex h-[42px] w-[62px] flex-none flex-col justify-center gap-[3px] rounded-md border px-2 transition-colors duration-200',
        active ? 'border-brand/25 bg-[#0b130f]' : 'border-white/[0.05] bg-[#0a0b0d]',
      )}
    >
      {style === 'minimal' && (
        <>
          <span className={cn('h-[2.5px] w-4 rounded-full', accent)} />
          <span className={cn('h-[4px] w-[70%] rounded-full', line)} />
        </>
      )}
      {style === 'balanced' && (
        <>
          <span className={cn('h-[2.5px] w-3.5 rounded-full', accent)} />
          <span className={cn('h-[3.5px] w-[80%] rounded-full', line)} />
          <span className={cn('h-[2.5px] w-[62%] rounded-full', faint)} />
          <span className={cn('h-[2.5px] w-[72%] rounded-full', faint)} />
        </>
      )}
      {style === 'bold' && (
        <>
          <span className={cn('h-[6px] w-[86%] rounded-[2px]', line)} />
          <span className={cn('h-[6px] w-[54%] rounded-[2px]', accent)} />
        </>
      )}
    </div>
  );
}

interface StepDirectionProps {
  goal: PresentationGoal | null;
  audience: string;
  style: VisualStyle | null;
  tone: number;
  onGoalChange: (goal: PresentationGoal) => void;
  onAudienceChange: (audience: string) => void;
  onStyleChange: (style: VisualStyle) => void;
  onToneChange: (tone: number) => void;
}

/** Cabeçalho de coluna do andar de baixo: filete curto + rótulo, iguais nas três. */
function ColumnLabel({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <div className="flex items-center gap-2">
        <span className="h-px w-4 bg-brand/70" />
        <h3 className="m-0 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink">{children}</h3>
      </div>
      {hint && <span className="text-[11px] text-ink-muted">{hint}</span>}
    </div>
  );
}

const PANEL = 'rounded-2xl border border-white/[0.06] bg-surface p-4';

export function StepDirection({
  goal,
  audience,
  style,
  tone,
  onGoalChange,
  onAudienceChange,
  onStyleChange,
  onToneChange,
}: StepDirectionProps) {
  return (
    <div>
      <StepHeader
        kicker="Direção"
        title="Que caminho essa história toma?"
        subtitle="O objetivo define a narrativa. O resto afina a voz e a cor do deck."
      />

      {/* Andar de cima: os 4 objetivos, iguais e enxutos. */}
      <div
        role="radiogroup"
        aria-label="Objetivo da apresentação"
        className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {GOAL_OPTIONS.map((option) => {
          const selected = goal === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onGoalChange(option.value)}
              className={cn(
                'group relative flex rounded-2xl border p-4 text-left transition-all duration-200 focus:outline-none',
                selected
                  ? 'border-brand/45 bg-brand/[0.06] shadow-[0_0_0_1px_rgba(45,219,96,0.28),0_18px_44px_-26px_rgba(45,219,96,0.45)]'
                  : 'border-white/[0.06] bg-surface hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-surface-2',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 flex-none items-center justify-center rounded-xl border transition-colors duration-300',
                    selected
                      ? 'border-brand/40 bg-brand/[0.14] text-brand'
                      : 'border-white/[0.08] bg-white/[0.03] text-ink-muted',
                  )}
                >
                  <Icon name={option.icon} size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{option.label}</div>
                  <div
                    className={cn(
                      'truncate text-[12px] font-medium transition-colors duration-300',
                      selected ? 'text-brand' : 'text-ink-muted',
                    )}
                  >
                    {option.outcome}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Andar de baixo: três colunas. Cada painel distribui seu conteúdo do topo ao
          rodapé (rodapé ancorado com mt-auto), então nenhuma coluna fica com um vazio
          morto embaixo quando a grade iguala as alturas. */}
      <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-3">
        {/* Público: campo + sugestões em lista vertical, que preenchem a coluna por
            igual (justify-between) — nada de vazio morto embaixo. Rima com a lista de Voz. */}
        <section className={cn(PANEL, 'flex flex-col')}>
          <ColumnLabel hint="Opcional">Público</ColumnLabel>
          <input
            type="text"
            value={audience}
            maxLength={AUDIENCE_MAX}
            onChange={(event) => onAudienceChange(event.target.value)}
            placeholder="Ex.: Diretoria De Marketing"
            aria-label="Público da apresentação"
            className="w-full rounded-control border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors duration-200 placeholder:text-ink-muted/70 focus:border-brand/40"
          />
          <div className="mt-3 flex flex-1 flex-col justify-between gap-1.5">
            {AUDIENCE_EXAMPLES.map((example) => {
              const active = audience.trim() === example;
              return (
                <button
                  key={example}
                  type="button"
                  onClick={() => onAudienceChange(example)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[12.5px] transition-all duration-150',
                    active
                      ? 'border-brand/40 bg-brand/[0.07] text-ink'
                      : 'border-white/[0.05] bg-white/[0.02] text-ink-muted hover:border-white/[0.12] hover:bg-white/[0.03] hover:text-ink-secondary',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 flex-none rounded-full', active ? 'bg-brand' : 'bg-white/25')} />
                  {example}
                </button>
              );
            })}
          </div>
          <p className="pt-3 text-[11.5px] text-ink-muted">Em branco, a IA deduz o público.</p>
        </section>

        {/* Voz: quanto texto cada voz gera. Lista vertical, cada opção respira e mostra
            um selo fiel da densidade que ela produz (Sereno vazio, Preciso lista, Presença manchete). */}
        <section className={cn(PANEL, 'flex flex-col')}>
          <ColumnLabel hint="Quanto texto">Voz</ColumnLabel>
          <div role="radiogroup" aria-label="Voz da escrita" className="flex flex-1 flex-col justify-between gap-2">
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
                    'group flex flex-1 items-center gap-3 rounded-xl border p-2.5 text-left transition-all duration-200',
                    selected
                      ? 'border-brand/45 bg-brand/[0.07]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]',
                  )}
                >
                  <VoicePreview style={option.value} active={selected} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13.5px] font-semibold text-ink">{option.label}</span>
                      {selected && <Icon name="check" size={12} strokeWidth={2.6} className="ml-auto text-brand" />}
                    </div>
                    <p className="mt-0.5 text-[11.5px] leading-[1.35] text-ink-muted">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Cor: a estrela. A barra de tom com o leitor-herói e as três capas ao vivo. */}
        <section className={cn(PANEL, 'flex flex-col')}>
          <ColumnLabel hint="Repinta o deck">Cor</ColumnLabel>
          <ToneBar value={tone} onChange={onToneChange} />
          <p className="mt-auto pt-4 text-[11.5px] leading-[1.4] text-ink-muted">
            Arraste e veja sua apresentação mudar.
          </p>
        </section>
      </div>
    </div>
  );
}
