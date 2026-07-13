import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

interface SectionLinkProps {
  to: string;
  children: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SectionLink({ to, children, size = 'md', className }: SectionLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-1 font-medium text-brand transition-colors duration-150 hover:text-brand-glow',
        size === 'md' ? 'text-[12.5px]' : 'text-xs',
        className,
      )}
    >
      {children}
      <Icon name="chevron-right" size={size === 'md' ? 12 : 11} />
    </Link>
  );
}
