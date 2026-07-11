import { SIZE_OPTIONS } from '@/data/creationOptions';
import { OptionCard } from '@/components/creation/OptionCard';
import { StepHeader } from '@/components/creation/StepHeader';
import { cn } from '@/lib/cn';
import type { PresentationSize } from '@/types/creation';

interface StepSizeProps {
  value: PresentationSize | null;
  onChange: (size: PresentationSize) => void;
}

/** Quantos slides em miniatura desenhar no topo de cada card. */
const DECK_PREVIEW: Record<PresentationSize, number> = {
  focused: 5,
  balanced: 7,
  complete: 10,
};

function MiniDeck({ count, selected }: { count: number; selected: boolean }) {
  return (
    <div aria-hidden="true" className="flex h-9 items-end gap-1">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            'w-5 rounded-[3px] border transition-colors duration-300',
            i === 0
              ? selected
                ? 'border-brand/60 bg-brand/40'
                : 'border-white/20 bg-white/15'
              : selected
                ? 'border-brand/25 bg-brand/[0.12]'
                : 'border-white/[0.09] bg-white/[0.05]',
          )}
          style={{ height: `${Math.max(14, 30 - i * 2)}px` }}
        />
      ))}
    </div>
  );
}

export function StepSize({ value, onChange }: StepSizeProps) {
  return (
    <div>
      <StepHeader
        kicker="Contexto"
        title="Onde ela vai viver?"
        subtitle="Não é sobre quantidade. É sobre o momento em que essa apresentação vai acontecer. O tamanho, deixa comigo."
      />

      <div role="radiogroup" aria-label="Contexto da apresentação" className="mt-8 grid gap-4 md:grid-cols-3">
        {SIZE_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <OptionCard key={option.value} selected={selected} onSelect={() => onChange(option.value)}>
              <MiniDeck count={DECK_PREVIEW[option.value]} selected={selected} />
              <div className="mt-5 text-[18px] font-semibold tracking-[-0.01em] text-ink">{option.label}</div>
              <div
                className={cn(
                  'mt-1.5 inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition-colors duration-300',
                  selected
                    ? 'border-brand/35 bg-brand/10 text-brand'
                    : 'border-white/[0.08] bg-white/[0.03] text-ink-muted',
                )}
              >
                {option.hint}
              </div>
              <p className="mt-4 text-[13.5px] leading-[1.55] text-ink-secondary">{option.description}</p>
            </OptionCard>
          );
        })}
      </div>
    </div>
  );
}
