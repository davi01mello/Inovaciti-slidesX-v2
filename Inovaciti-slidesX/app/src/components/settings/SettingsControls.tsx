import { cn } from '@/lib/cn';

interface ToggleProps {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

/** Switch da casa: pílula com o polegar deslizando e glow quando ligado. */
export function Toggle({ on, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        'relative h-[26px] w-[46px] flex-none rounded-full border transition-all duration-200',
        on
          ? 'border-brand/50 bg-gradient-to-b from-[#36E66A] to-brand shadow-[0_0_14px_-3px_rgba(45,219,96,0.6)]'
          : 'border-white/[0.12] bg-white/[0.06]',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 h-[20px] w-[20px] -translate-y-1/2 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-all duration-200',
          on ? 'left-[23px]' : 'left-[3px]',
        )}
      />
    </button>
  );
}

interface ChipGroupProps<T extends string> {
  options: { value: T; label: string }[];
  value: T | null;
  /** Clicar no chip já selecionado limpa a escolha (volta pra null). */
  onChange: (next: T | null) => void;
}

export function ChipGroup<T extends string>({ options, value, onChange }: ChipGroupProps<T>) {
  return (
    <div className="flex flex-none flex-wrap items-center gap-1.5">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : option.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all duration-150',
              selected
                ? 'border-brand/35 bg-brand/[0.10] text-brand shadow-[0_0_12px_-4px_rgba(45,219,96,0.5)]'
                : 'border-white/[0.07] bg-white/[0.02] text-ink-secondary hover:border-white/[0.14] hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
