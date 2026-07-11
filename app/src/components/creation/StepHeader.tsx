import type { ReactNode } from 'react';

interface StepHeaderProps {
  kicker: string;
  title: ReactNode;
  subtitle: ReactNode;
}

/**
 * Cabeçalho padrão de cada passo do wizard. Compacto de propósito: o fluxo
 * inteiro precisa caber na viewport, sem rolagem até o botão de continuar.
 */
export function StepHeader({ kicker, title, subtitle }: StepHeaderProps) {
  return (
    <header>
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="h-px w-6 bg-gradient-to-r from-brand to-transparent" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">{kicker}</span>
      </div>
      <h1 className="m-0 text-[clamp(28px,4.2vh,40px)] font-bold leading-[1.06] tracking-[-0.03em] text-ink">
        {title}
      </h1>
      <p className="mt-3 max-w-[640px] text-[15px] leading-[1.55] text-ink-secondary">{subtitle}</p>
    </header>
  );
}
