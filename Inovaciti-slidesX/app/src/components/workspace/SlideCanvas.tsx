import { useCallback, useEffect, useRef, useState } from 'react';
import { FreeBlock } from '@/components/workspace/FreeBlock';
import { BlockKindMenu } from '@/components/workspace/BlockKindMenu';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import type { Guide } from '@/lib/snap';
import type { Block, BlockRect, Slide } from '@/types/slide';

interface SlideCanvasProps {
  slide: Slide;
  onBlockChange: (blockId: string, patch: Partial<Block>) => void;
  onBlockMove: (blockId: string, rect: BlockRect) => void;
  onBlockDelete: (blockId: string) => void;
  onBlockDuplicate: (blockId: string) => void;
  onBlockKindChange: (blockId: string, kind: Block['kind']) => void;
  onInsertBlock: (kind: Block['kind']) => void;
  onImprove: () => void;
  isImproving?: boolean;
}

/**
 * The main slide surface. Renders blocks free-positioned with absolute coordinates.
 * `overflow: hidden` on the container guarantees blocks never visually escape the slide,
 * matching the Google Slides / Canva behavior.
 */
export function SlideCanvas({
  slide,
  onBlockChange,
  onBlockMove,
  onBlockDelete,
  onBlockDuplicate,
  onBlockKindChange,
  onInsertBlock,
  onImprove,
  isImproving = false,
}: SlideCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // Deselect when switching slides.
  useEffect(() => {
    setSelectedBlockId(null);
    setEditingBlockId(null);
  }, [slide.id]);

  // Global key handlers on the canvas.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (editingBlockId) {
        if (event.key === 'Escape') {
          setEditingBlockId(null);
          (document.activeElement as HTMLElement | null)?.blur();
        }
        return;
      }
      if (!selectedBlockId) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Only delete when focus is on the canvas itself, not a form field.
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
        event.preventDefault();
        onBlockDelete(selectedBlockId);
        setSelectedBlockId(null);
      }
      if (event.key === 'Escape') {
        setSelectedBlockId(null);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editingBlockId, selectedBlockId, onBlockDelete]);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent) => {
    // Click on empty space deselects.
    if (event.target === canvasRef.current) {
      setSelectedBlockId(null);
      setEditingBlockId(null);
    }
  }, []);

  const otherRectsFor = useCallback(
    (blockId: string): BlockRect[] => slide.blocks.filter((b) => b.id !== blockId).map((b) => b.rect),
    [slide.blocks],
  );

  return (
    <div className="relative w-full max-w-[960px]">
      {/* Melhorar este slide sits above the slide, outside its content area */}
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onImprove}
          disabled={isImproving}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/[0.10] px-2.5 text-[11.5px] font-semibold text-brand transition-colors duration-150 hover:bg-brand/[0.18] disabled:cursor-not-allowed disabled:opacity-50"
          title="Regenerar este slide considerando o contexto"
        >
          {isImproving ? <Spinner size="sm" /> : <Icon name="sparkles" size={11} />}
          {isImproving ? 'Melhorando…' : 'Melhorar este slide'}
        </button>
      </div>

      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-surface text-[color:var(--color-slide-fg)] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]"
      >
        {slide.blocks.map((block) => (
          <FreeBlock
            key={block.id}
            block={block}
            otherRects={otherRectsFor(block.id)}
            canvasRef={canvasRef}
            isSelected={selectedBlockId === block.id}
            isEditing={editingBlockId === block.id}
            onSelect={() => {
              setSelectedBlockId(block.id);
              if (editingBlockId && editingBlockId !== block.id) setEditingBlockId(null);
            }}
            onStartEditing={() => {
              setSelectedBlockId(block.id);
              setEditingBlockId(block.id);
            }}
            onExitEditing={() => setEditingBlockId(null)}
            onCommitRect={(rect) => onBlockMove(block.id, rect)}
            onContentChange={(patch) => onBlockChange(block.id, patch)}
            onChangeKind={(kind) => onBlockKindChange(block.id, kind)}
            onDelete={() => onBlockDelete(block.id)}
            onDuplicate={() => onBlockDuplicate(block.id)}
            onGuidesChange={setGuides}
          />
        ))}

        {/* Snap guides while dragging */}
        {guides.map((guide, i) => (
          <div
            key={i}
            className={cn(
              'pointer-events-none absolute z-30',
              guide.orientation === 'v' ? 'top-0 h-full w-px' : 'left-0 h-px w-full',
            )}
            style={{
              [guide.orientation === 'v' ? 'left' : 'top']: `${guide.at * 100}%`,
              background: guide.kind === 'center' ? 'rgba(9,232,128,0.9)' : 'rgba(9,232,128,0.55)',
              boxShadow: '0 0 8px rgba(9,232,128,0.35)',
            }}
          />
        ))}
      </div>

      {/* Add block affordance — outside the slide (never adds outside the visual area, just controls it) */}
      <div className="relative mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setAddMenuOpen((v) => !v)}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-lg border border-dashed border-white/[0.12] bg-app-bg px-2.5 text-[11.5px] font-medium text-ink-muted transition-colors duration-150 hover:border-brand/40 hover:text-brand',
          )}
        >
          <Icon name="plus" size={11} />
          Adicionar bloco
        </button>
        {addMenuOpen && (
          <div className="relative">
            <BlockKindMenu
              anchor="above"
              onSelect={(kind) => {
                setAddMenuOpen(false);
                onInsertBlock(kind);
              }}
              onClose={() => setAddMenuOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
