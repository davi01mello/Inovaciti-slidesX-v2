import { useRef, useState } from 'react';
import { SlideThumbnail } from '@/components/workspace/SlideThumbnail';
import { Icon } from '@/components/ui/Icon';
import type { Slide } from '@/types/slide';

interface SlideThumbnailsProps {
  slides: Slide[];
  currentSlideId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, targetIndex: number) => void;
}

export function SlideThumbnails({
  slides,
  currentSlideId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onReorder,
}: SlideThumbnailsProps) {
  const draggingIdRef = useRef<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const currentSlide = slides.find((s) => s.id === currentSlideId) ?? slides[0];
  const canDelete = slides.length > 1;

  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.05] bg-app-bg px-6 pb-5 pt-4">
      <div className="flex items-center justify-between">
        <div className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Slides · {slides.length}
        </div>
        <div className="flex items-center gap-1">
          {currentSlide && (
            <>
              <ThumbAction onClick={() => onDuplicate(currentSlide.id)} icon="templates" label="Duplicar" />
              <ThumbAction
                onClick={() => canDelete && onDelete(currentSlide.id)}
                icon="trash"
                label="Excluir"
                disabled={!canDelete}
                tone="danger"
              />
            </>
          )}
        </div>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-1"
        onDragLeave={() => setDragOverIndex(null)}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className="relative"
            onDragOver={(event) => {
              event.preventDefault();
              setDragOverIndex(index);
            }}
          >
            {dragOverIndex === index && draggingIdRef.current && draggingIdRef.current !== slide.id && (
              <div className="pointer-events-none absolute -left-2 top-0 h-full w-0.5 rounded-full bg-brand" />
            )}
            <SlideThumbnail
              slide={slide}
              index={index}
              active={slide.id === currentSlideId}
              onClick={() => onSelect(slide.id)}
              onDragStart={() => {
                draggingIdRef.current = slide.id;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggingIdRef.current && draggingIdRef.current !== slide.id) {
                  onReorder(draggingIdRef.current, index);
                }
                draggingIdRef.current = null;
                setDragOverIndex(null);
              }}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="flex aspect-[16/9] w-[172px] flex-none flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.10] text-ink-muted transition-all duration-150 hover:border-brand/40 hover:bg-brand/[0.04] hover:text-brand"
        >
          <Icon name="plus" size={16} />
          <span className="text-[11px] font-medium">Adicionar slide</span>
        </button>
      </div>
    </div>
  );
}

interface ThumbActionProps {
  onClick: () => void;
  icon: 'templates' | 'trash';
  label: string;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}

function ThumbAction({ onClick, icon, label, disabled, tone = 'default' }: ThumbActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={
        'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium transition-colors duration-150 disabled:opacity-30 ' +
        (tone === 'danger'
          ? 'text-ink-muted hover:bg-[#ff8a8a]/10 hover:text-[#ff8a8a]'
          : 'text-ink-muted hover:bg-white/[0.04] hover:text-ink')
      }
    >
      <Icon name={icon} size={12} />
      {label}
    </button>
  );
}
