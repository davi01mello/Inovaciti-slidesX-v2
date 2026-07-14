import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

interface OptionCardProps {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Card de seleção único (usado nos passos de contexto e estilo) pra manter o
 * mesmo padrão visual: mesma borda, mesmo estado selecionado, mesmo badge.
 */
export function OptionCard({ selected, onSelect, children, className }: OptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col rounded-2xl border p-5 text-left transition-all duration-200 focus:outline-none',
        selected
          ? 'border-brand/45 bg-brand/[0.05] shadow-[0_0_0_1px_rgba(45,219,96,0.28),0_18px_44px_-24px_rgba(45,219,96,0.4)]'
          : 'border-white/[0.06] bg-surface hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-surface-2 hover:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)]',
        className,
      )}
    >
      {selected && (
        <motion.span
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 480, damping: 26 }}
          className="absolute right-3.5 top-3.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-brand-glow to-brand text-[#0A1210] shadow-[0_4px_14px_-4px_rgba(45,219,96,0.8)]"
        >
          <Icon name="check" size={13} strokeWidth={2.6} />
        </motion.span>
      )}
      {children}
    </button>
  );
}
