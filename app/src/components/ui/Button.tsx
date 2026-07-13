import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-[#36E66A] to-brand text-[#0A1210] shadow-[0_10px_28px_-10px_rgba(45,219,96,0.6),inset_0_1px_0_rgba(255,255,255,0.35)] hover:-translate-y-px hover:shadow-[0_14px_32px_-10px_rgba(45,219,96,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] active:translate-y-0 active:from-brand active:to-brand-active',
  secondary:
    'bg-surface-2 text-ink border border-border-subtle hover:bg-surface-3 hover:border-border-hover',
  ghost: 'text-ink-secondary hover:bg-white/5 hover:text-ink',
};

export function Button({ variant = 'primary', className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-2.5 rounded-control px-6 py-3.5 text-sm font-semibold tracking-[-0.005em] transition-all duration-200',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
