import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Kbd } from '@/components/ui/Kbd';
import { cn } from '@/lib/cn';

interface WizardNavProps {
  step: number;
  stepLabels: readonly string[];
  onBack?: () => void;
  onContinue: () => void;
  /** Pular direto pra um passo já visitado (clicando no stepper). */
  onStepSelect: (step: number) => void;
  canContinue: boolean;
  continueLabel?: string;
  /** Tecla exibida como dica ao lado do CTA (ex.: "Enter" ou "⌘ Enter"). */
  continueHint?: string;
}

/**
 * Rodapé fixo do wizard: voltar à esquerda, stepper clicável no centro e o
 * CTA sempre visível à direita — nunca é preciso rolar pra continuar.
 */
export function WizardNav({
  step,
  stepLabels,
  onBack,
  onContinue,
  onStepSelect,
  canContinue,
  continueLabel = 'Continuar',
  continueHint,
}: WizardNavProps) {
  return (
    <div className="grid h-[88px] grid-cols-[1fr_auto_1fr] items-center gap-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          disabled={!onBack}
          className={cn(
            'inline-flex items-center gap-2 rounded-control px-4 py-2.5 text-sm font-medium text-ink-muted transition-all duration-150',
            onBack ? 'hover:bg-white/[0.04] hover:text-ink' : 'pointer-events-none opacity-0',
          )}
        >
          <Icon name="chevron-right" size={13} className="rotate-180" />
          Voltar
        </button>
      </div>

      <nav aria-label="Passos da criação" className="flex items-start gap-1.5">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isDone = stepNumber < step;
          const isCurrent = stepNumber === step;
          return (
            <div key={label} className="flex items-start">
              {index > 0 && (
                <div
                  className={cn(
                    'mx-1 mt-[13px] h-px w-5 transition-colors duration-300',
                    isDone || isCurrent ? 'bg-brand/40' : 'bg-white/[0.08]',
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => onStepSelect(stepNumber)}
                disabled={!isDone}
                aria-current={isCurrent ? 'step' : undefined}
                title={isDone ? `Voltar pra ${label}` : label}
                className={cn('group flex w-[64px] flex-col items-center gap-1.5', isDone && 'cursor-pointer')}
              >
                <span
                  className={cn(
                    'flex h-[26px] w-[26px] items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums transition-all duration-300',
                    isDone &&
                      'border-brand/40 bg-brand/15 text-brand group-hover:bg-brand/25 group-hover:shadow-[0_0_16px_-4px_rgba(45,219,96,0.6)]',
                    isCurrent &&
                      'border-brand bg-gradient-to-b from-brand-glow to-brand text-[#0A1210] shadow-[0_4px_16px_-4px_rgba(45,219,96,0.7)]',
                    !isDone && !isCurrent && 'border-white/[0.08] bg-surface text-ink-muted/60',
                  )}
                >
                  {isDone ? <Icon name="check" size={12} strokeWidth={2.4} /> : stepNumber}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-medium tracking-[0.02em] transition-colors duration-300',
                    isCurrent ? 'text-ink' : isDone ? 'text-ink-muted group-hover:text-ink-secondary' : 'text-ink-muted/50',
                  )}
                >
                  {label}
                </span>
              </button>
            </div>
          );
        })}
      </nav>

      <div className="flex items-center justify-end gap-4">
        {continueHint && canContinue && (
          <span className="hidden items-center gap-1.5 text-[11.5px] text-ink-muted sm:flex">
            <Kbd>{continueHint}</Kbd>
          </span>
        )}
        <Button
          onClick={onContinue}
          disabled={!canContinue}
          className="disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[0_10px_28px_-10px_rgba(45,219,96,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]"
        >
          {continueLabel}
          <Icon name="chevron-right" size={14} />
        </Button>
      </div>
    </div>
  );
}
