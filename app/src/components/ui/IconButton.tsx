import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  'aria-label': string;
}

export function IconButton({ className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-secondary transition-colors duration-200 hover:bg-white/5',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
