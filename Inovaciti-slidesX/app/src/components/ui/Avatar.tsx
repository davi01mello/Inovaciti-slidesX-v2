import { cn } from '@/lib/cn';

interface AvatarProps {
  initials: string;
  gradient?: string;
  size?: number;
  className?: string;
}

/** Verde da casa: o avatar é um dos poucos pontos onde a marca pode ser tinta, não acento. */
const DEFAULT_GRADIENT = 'from-[#3ee878] to-[#0f9e6e]';

export function Avatar({ initials, gradient = DEFAULT_GRADIENT, size = 34, className }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex flex-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-bold text-[#07130b] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_12px_-4px_rgba(45,219,96,0.5)]',
        gradient,
        className,
      )}
      style={{ width: size, height: size, fontSize: size <= 28 ? 10 : size >= 52 ? 18 : 13 }}
    >
      <span>{initials}</span>
    </div>
  );
}
