import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  children: ReactNode;
  tone?: 'default' | 'danger';
}

const TONE_CLASSES: Record<NonNullable<MenuItemProps['tone']>, string> = {
  default: 'text-ink-secondary hover:bg-white/5',
  danger: 'text-[#ff8a8a] hover:bg-[#ff8a8a]/10',
};

export function MenuItem({ icon, children, tone = 'default', className, ...rest }: MenuItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors duration-150',
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
