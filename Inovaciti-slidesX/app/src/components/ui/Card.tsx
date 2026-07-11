import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: 'section' | 'div';
}

export function Card({ as: Tag = 'section', className, children, ...rest }: CardProps) {
  return (
    <Tag
      className={cn('rounded-card border border-border-subtle bg-surface', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
