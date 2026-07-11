import { cn } from '@/lib/cn';
import { SlideComposition } from '@/components/present/SlideComposition';
import type { Slide } from '@/types/slide';

interface SlideThumbnailProps {
  slide: Slide;
  index: number;
  active: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: () => void;
}

/** Miniatura fiel: a mesma composição de template da apresentação, em escala. */
export function SlideThumbnail({
  slide,
  index,
  active,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}: SlideThumbnailProps) {
  return (
    <button
      type="button"
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        'group relative aspect-[16/9] w-[172px] flex-none overflow-hidden rounded-lg border p-0 text-left transition-all duration-150',
        active
          ? 'border-brand/50 bg-surface shadow-[0_0_0_1px_rgba(45,219,96,0.35)]'
          : 'border-white/[0.06] bg-surface/80 hover:border-white/[0.14] hover:bg-surface',
      )}
    >
      <span
        className={cn(
          'absolute right-1.5 top-1.5 z-10 rounded bg-black/60 px-1 py-px text-[10px] font-semibold tabular-nums backdrop-blur-sm',
          active ? 'text-brand' : 'text-white/80',
        )}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <SlideComposition slide={slide} />
    </button>
  );
}
