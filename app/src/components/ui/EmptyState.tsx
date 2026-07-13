/**
 * Estado vazio padrão: pilha de slides estilizada com o brilho da marca,
 * uma frase de orientação e um CTA opcional. Nada de "nada aqui ainda" seco.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

function SlideStackMark({ size }: { size: number }) {
  return (
    <div className="relative" style={{ width: size, height: size * 0.72 }} aria-hidden="true">
      <div
        className="absolute rounded-[22%] border border-brand/15 bg-brand/[0.04]"
        style={{ inset: 0, transform: 'rotate(-6deg) translateY(6%)' }}
      />
      <div
        className="absolute rounded-[22%] border border-brand/25 bg-brand/[0.07]"
        style={{ inset: 0, transform: 'rotate(3deg)' }}
      />
      <div
        className="absolute flex items-center justify-center rounded-[22%] border border-brand/35 bg-[#101711] shadow-[0_10px_28px_-12px_rgba(45,219,96,0.35)]"
        style={{ inset: 0 }}
      >
        <div className="flex w-[58%] flex-col gap-[12%]">
          <span className="h-[3px] w-[45%] rounded-full bg-brand/80" />
          <span className="h-[3px] w-full rounded-full bg-white/25" />
          <span className="h-[3px] w-[72%] rounded-full bg-white/15" />
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  hint: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ title, hint, action, compact = false }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-3 py-6' : 'gap-5 py-12')}>
      <SlideStackMark size={compact ? 44 : 64} />
      <div>
        <div className={cn('font-semibold tracking-[-0.005em] text-ink', compact ? 'text-[13px]' : 'text-[15px]')}>{title}</div>
        <p className={cn('mt-1 leading-[1.5] text-ink-muted', compact ? 'text-[12px]' : 'text-[13px]')}>{hint}</p>
      </div>
      {action}
    </div>
  );
}
