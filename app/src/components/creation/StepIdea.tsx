import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { StepHeader } from '@/components/creation/StepHeader';
import { TEMPLATES } from '@/data/templates';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

interface StepIdeaProps {
  value: string;
  onChange: (value: string) => void;
}

export const MIN_IDEA_CHARS = 100;

const PLACEHOLDER =
  'Ex.: proposta pra levar nosso produto de análise de dados pro time de ops de uma varejista grande. Queria focar em ganho de tempo de decisão e mostrar dois cases parecidos. Se quiser, já pode descrever slide por slide. Quanto mais detalhe você me der, melhor fica.';

/**
 * Pontos de partida. Não são frases de efeito: são o briefing inteiro daquele
 * tipo de deck, com [colchetes] no que a pessoa troca. O atalho existe pra ela
 * chegar no passo seguinte com contexto de verdade, e não com duas linhas que a
 * IA teria que adivinhar. São os mesmos esqueletos dos templates, então o texto
 * mora num lugar só (ver data/templates.ts).
 */
const STARTER_IDS = ['proposta-comercial', 'pitch-produto', 'relatorio-executivo'] as const;

const STARTERS = STARTER_IDS.map((id) => {
  const template = TEMPLATES.find((t) => t.id === id);
  return { label: template?.name ?? id, skeleton: template?.ideaSkeleton ?? '' };
}).filter((starter) => starter.skeleton.length > 0);

export function StepIdea({ value, onChange }: StepIdeaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const count = value.trim().length;
  const reached = count >= MIN_IDEA_CHARS;
  const progress = Math.min(1, count / MIN_IDEA_CHARS);

  return (
    <div>
      <StepHeader
        kicker="Começando"
        title={
          <>
            Conta pra mim. <span className="text-ink-secondary">Sobre o que é?</span>
          </>
        }
        subtitle="Descreva do jeito que fizer sentido pra você. Se preferir jogar a ideia livre, ótimo. Se quiser descrever slide por slide, melhor ainda."
      />

      <div
        className={cn(
          'mt-7 overflow-hidden rounded-2xl border bg-surface transition-colors duration-200 focus-within:bg-surface-2',
          reached ? 'border-brand/30 focus-within:border-brand/45' : 'border-white/[0.06] focus-within:border-brand/40',
        )}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={PLACEHOLDER}
          aria-label="Descreva a ideia da apresentação"
          className="block h-[clamp(150px,26vh,240px)] w-full resize-none bg-transparent p-5 text-[15.5px] leading-[1.6] text-ink outline-none placeholder:text-ink-muted/60"
        />

        <div className="flex items-center gap-3 border-t border-white/[0.05] px-5 py-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
            <motion.div
              className={cn('h-full rounded-full', reached ? 'bg-brand' : 'bg-brand/55')}
              initial={false}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {reached ? (
              <motion.span
                key="ready"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand"
              >
                <Icon name="check" size={12} strokeWidth={2.4} />
                Pronto pra continuar
              </motion.span>
            ) : (
              <motion.span
                key="count"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="text-[12px] font-medium tabular-nums text-ink-muted"
              >
                {count} / {MIN_IDEA_CHARS}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Pontos de partida: só aparecem com o campo vazio, saem de cena ao digitar. */}
      <AnimatePresence initial={false}>
        {value.trim().length === 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <span className="text-[12px] font-medium text-ink-muted">Precisa de um empurrão?</span>
              {STARTERS.map((starter) => (
                <button
                  key={starter.label}
                  type="button"
                  onClick={() => {
                    onChange(starter.skeleton);
                    ref.current?.focus();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-surface px-3.5 py-1.5 text-[12px] font-medium text-ink-secondary transition-all duration-150 hover:border-brand/35 hover:bg-brand/[0.06] hover:text-ink"
                >
                  <Icon name="sparkles" size={12} className="text-brand" />
                  {starter.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
