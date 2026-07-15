/**
 * Passo 3, "Extensão": quantos slides essa história pede.
 *
 * Esta página nasceu de novo. A anterior oferecia três caixas de tamanho
 * ("reunião rápida", "pitch", "institucional") e uma barra de 1 a 50. As duas
 * coisas estavam erradas: as caixas obrigavam a pessoa a se encaixar num rótulo
 * que não era o dela, e a barra transformava a escolha numa disputa por
 * território, onde puxar mais parecia ganhar mais.
 *
 * A pergunta certa não é "qual o tamanho" nem "qual o limite". É "quanto essa
 * história precisa". Então aqui:
 *
 *   1. o sistema LÊ o briefing e recomenda um número, com o motivo em uma linha;
 *   2. o número é o herói da tela, ajustável a qualquer momento;
 *   3. toda mudança mostra a CONSEQUÊNCIA na hora: que forma o deck ganha, como
 *      ele se compõe e quantos minutos de fala aquilo representa.
 *
 * A pessoa escolhe. Só que nunca escolhe no escuro.
 */
import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { StepHeader } from '@/components/creation/StepHeader';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import {
  FORM_SHORTCUTS,
  clampSlideCount,
  composeDeck,
  deckSequence,
  estimateSpeakingTime,
  formOf,
  formatSpeakingTime,
  suggestSlideCount,
  type SlideRole,
} from '@/lib/slidePlan';
import { SLIDE_COUNT_MAX, SLIDE_COUNT_MIN, type PresentationGoal } from '@/types/creation';

const EASE = [0.16, 1, 0.3, 1] as const;

/** Acima disso o preview vira denso demais pra ler: mostra a cabeça do deck e resume o resto. */
const MAX_PREVIEW_SLIDES = 22;

const ROLE_STYLE: Record<SlideRole, string> = {
  cover: 'bg-brand',
  section: 'border border-brand/50 bg-brand/15',
  content: 'bg-white/[0.14]',
  closing: 'bg-brand/45',
};

const ROLE_LABEL: Record<SlideRole, string> = {
  cover: 'Capa',
  section: 'Capítulo',
  content: 'Conteúdo',
  closing: 'Fechamento',
};

interface StepSlidesProps {
  idea: string;
  goal: PresentationGoal | null;
  value: number;
  onChange: (count: number) => void;
}

/** O deck desenhado slide a slide, colorido pelo papel de cada um. */
function DeckPreview({ count }: { count: number }) {
  const roles = deckSequence(count);
  const visible = roles.slice(0, MAX_PREVIEW_SLIDES);
  const hidden = roles.length - visible.length;

  return (
    <div aria-hidden="true" className="flex flex-wrap items-center gap-1.5">
      {visible.map((role, index) => (
        <motion.span
          key={`${role}-${index}`}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: EASE, delay: Math.min(index, 12) * 0.012 }}
          className={cn('h-8 w-[18px] flex-none rounded-[3px]', ROLE_STYLE[role])}
        />
      ))}
      {hidden > 0 && <span className="ml-1 text-[12px] font-medium tabular-nums text-ink-muted">+{hidden}</span>}
    </div>
  );
}

export function StepSlides({ idea, goal, value, onChange }: StepSlidesProps) {
  // A sugestão só muda quando o briefing ou o objetivo mudam, nunca ao mexer no número.
  const suggestion = useMemo(() => suggestSlideCount(idea, goal), [idea, goal]);

  const form = formOf(value);
  const deck = composeDeck(value);
  const time = estimateSpeakingTime(value);
  const onSuggestion = value === suggestion.count;

  const step = (delta: number) => onChange(clampSlideCount(value + delta));

  const composition = [
    { role: 'cover' as const, count: deck.cover },
    { role: 'content' as const, count: deck.content },
    { role: 'section' as const, count: deck.sections },
    { role: 'closing' as const, count: deck.closing },
  ].filter((part) => part.count > 0);

  return (
    <div>
      <StepHeader
        kicker="Extensão"
        title="Quantos slides essa história pede?"
        subtitle="Ajuste o número como quiser. A sugestão abaixo saiu do seu briefing."
      />

      {/* A recomendação, com o motivo. É o primeiro elemento porque é a resposta
          que a pessoa veio buscar. */}
      <div
        className={cn(
          'mt-7 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border p-4 transition-colors duration-300',
          onSuggestion ? 'border-brand/30 bg-brand/[0.06]' : 'border-white/[0.07] bg-surface',
        )}
      >
        <div
          className={cn(
            'flex h-9 w-9 flex-none items-center justify-center rounded-xl transition-colors duration-300',
            onSuggestion ? 'bg-brand/20 text-brand' : 'bg-white/[0.05] text-ink-muted',
          )}
        >
          <Icon name={onSuggestion ? 'check' : 'sparkles'} size={16} strokeWidth={onSuggestion ? 2.4 : 1.7} />
        </div>

        <div className="min-w-[200px] flex-1">
          <div className="text-[14px] font-semibold text-ink">
            {onSuggestion
              ? `${suggestion.count} ${suggestion.count === 1 ? 'slide' : 'slides'}, a minha recomendação pra essa ideia.`
              : `Pra essa ideia, eu faria em ${suggestion.count} ${suggestion.count === 1 ? 'slide' : 'slides'}.`}
          </div>
          <p className="mb-0 mt-0.5 text-[12.5px] leading-[1.5] text-ink-muted">{suggestion.reason}</p>
        </div>

        {!onSuggestion && (
          <button
            type="button"
            onClick={() => onChange(clampSlideCount(suggestion.count))}
            className="flex-none rounded-full border border-brand/40 bg-brand/[0.1] px-3.5 py-1.5 text-[12.5px] font-semibold text-brand transition-colors duration-200 hover:border-brand/60 hover:bg-brand/[0.18]"
          >
            Usar {suggestion.count}
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* O número, herói da tela. Input de verdade: setas do teclado e digitação funcionam. */}
        <section className="flex flex-col rounded-2xl border border-white/[0.05] bg-surface p-6">
          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={value <= SLIDE_COUNT_MIN}
              aria-label="Um slide a menos"
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] text-[20px] leading-none text-ink-secondary transition-all duration-200 hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/[0.1] disabled:hover:text-ink-secondary"
            >
              −
            </button>

            <input
              type="number"
              min={SLIDE_COUNT_MIN}
              max={SLIDE_COUNT_MAX}
              value={value}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                if (Number.isNaN(parsed)) return;
                onChange(clampSlideCount(parsed));
              }}
              aria-label="Quantidade de slides"
              className="w-[112px] [appearance:textfield] rounded-xl border border-transparent bg-transparent text-center text-[64px] font-semibold leading-none tracking-[-0.03em] text-ink outline-none transition-colors duration-200 tabular-nums focus:border-brand/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />

            <button
              type="button"
              onClick={() => step(1)}
              disabled={value >= SLIDE_COUNT_MAX}
              aria-label="Um slide a mais"
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] text-[20px] leading-none text-ink-secondary transition-all duration-200 hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/[0.1] disabled:hover:text-ink-secondary"
            >
              +
            </button>
          </div>

          <div className="mt-1 text-center text-[12px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            {value === 1 ? 'slide' : 'slides'}
          </div>

          {/* A forma que essa quantidade cria, trocando ao vivo. */}
          <div className="mt-6 min-h-[92px] border-t border-white/[0.05] pt-5 text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={form.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: EASE }}
              >
                <div className="text-[16px] font-semibold tracking-[-0.01em] text-brand">{form.label}</div>
                <p className="mx-auto mb-0 mt-1.5 max-w-[38ch] text-[13px] leading-[1.55] text-ink-secondary">
                  {form.meaning}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {FORM_SHORTCUTS.map((shortcut) => {
              const active = value === shortcut.count;
              return (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={() => onChange(shortcut.count)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors duration-150',
                    active
                      ? 'border-brand/40 bg-brand/[0.1] text-brand'
                      : 'border-white/[0.07] bg-white/[0.02] text-ink-muted hover:border-white/[0.15] hover:text-ink-secondary',
                  )}
                >
                  {shortcut.label}
                  <span className="ml-1.5 tabular-nums opacity-60">{shortcut.count}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* A consequência: o que esse número vira de verdade. */}
        <section className="flex flex-col rounded-2xl border border-white/[0.05] bg-surface p-6">
          <h3 className="m-0 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            O deck que você vai receber
          </h3>

          {/* O miolo cresce e se centra: sem isso a legenda encosta no topo e sobra
              um vazio até a linha da duração, lá embaixo. */}
          <div className="flex flex-1 flex-col justify-center gap-5 py-6">
            <DeckPreview count={value} />

            <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
              {composition.map((part) => (
                <li key={part.role} className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
                  <span className={cn('h-3 w-2 flex-none rounded-[2px]', ROLE_STYLE[part.role])} />
                  <span className="font-medium tabular-nums text-ink">{part.count}</span>
                  {ROLE_LABEL[part.role]}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2.5 border-t border-white/[0.05] pt-5 text-[13px] text-ink-secondary">
            <Icon name="compass" size={15} className="flex-none text-brand" />
            <span>
              No palco, isso dá <span className="font-medium text-ink">{formatSpeakingTime(time)}</span>.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
