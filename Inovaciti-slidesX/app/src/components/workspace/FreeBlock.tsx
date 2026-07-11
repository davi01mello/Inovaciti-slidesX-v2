import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react';
import { AutoShrinkText } from '@/components/workspace/AutoShrinkText';
import { BlockKindMenu } from '@/components/workspace/BlockKindMenu';
import { RichEditable } from '@/components/workspace/RichEditable';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { clampRect } from '@/lib/rect';
import { snapForMove, type Guide } from '@/lib/snap';
import { ALIGN_CLASS, typographyClassFor } from '@/lib/blockTypography';
import { bulletsPresentation } from '@/services/slideLayout';
import { isEmpty, type RichText } from '@/lib/richText';
import { BLOCK_KIND_META } from '@/types/slide';
import type { Block, BlockRect, BulletsBlock, TextBlock } from '@/types/slide';

type Handle = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

interface FreeBlockProps {
  block: Block;
  otherRects: BlockRect[];
  canvasRef: RefObject<HTMLDivElement | null>;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartEditing: () => void;
  onExitEditing: () => void;
  onCommitRect: (rect: BlockRect) => void;
  onContentChange: (patch: Partial<Block>) => void;
  onChangeKind: (kind: Block['kind']) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onGuidesChange: (guides: Guide[]) => void;
}

/** A free-floating, draggable, resizable block on the slide surface. */
export function FreeBlock({
  block,
  otherRects,
  canvasRef,
  isSelected,
  isEditing,
  onSelect,
  onStartEditing,
  onExitEditing,
  onCommitRect,
  onContentChange,
  onChangeKind,
  onDelete,
  onDuplicate,
  onGuidesChange,
}: FreeBlockProps) {
  // Live rect while dragging/resizing — committed to store on mouseup.
  const [previewRect, setPreviewRect] = useState<BlockRect | null>(null);
  const [kindMenuOpen, setKindMenuOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const rect = previewRect ?? block.rect;

  const style: CSSProperties = useMemo(
    () => ({
      position: 'absolute',
      left: `${rect.x * 100}%`,
      top: `${rect.y * 100}%`,
      width: `${rect.width * 100}%`,
      height: `${rect.height * 100}%`,
      zIndex: isSelected ? 20 : 5,
    }),
    [rect, isSelected],
  );

  const beginDrag = useCallback(
    (event: ReactMouseEvent) => {
      if (isEditing) return;
      event.stopPropagation();
      onSelect();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasBox = canvas.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const startRect = block.rect;

      let latest: BlockRect | null = null;
      function onMove(e: MouseEvent) {
        const dx = (e.clientX - startX) / canvasBox.width;
        const dy = (e.clientY - startY) / canvasBox.height;
        const candidate: BlockRect = {
          x: startRect.x + dx,
          y: startRect.y + dy,
          width: startRect.width,
          height: startRect.height,
        };
        const { snapped, guides } = snapForMove(candidate, otherRects);
        const next = clampRect(snapped);
        latest = next;
        setPreviewRect(next);
        onGuidesChange(guides);
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        setPreviewRect(null);
        onGuidesChange([]);
        if (latest) onCommitRect(latest);
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [block.rect, canvasRef, isEditing, onCommitRect, onGuidesChange, onSelect, otherRects],
  );

  const beginResize = useCallback(
    (handle: Handle) => (event: ReactMouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      onSelect();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasBox = canvas.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const startRect = block.rect;

      let latest: BlockRect | null = null;
      function onMove(e: MouseEvent) {
        const dx = (e.clientX - startX) / canvasBox.width;
        const dy = (e.clientY - startY) / canvasBox.height;

        let x = startRect.x;
        let y = startRect.y;
        let w = startRect.width;
        let h = startRect.height;

        if (handle.includes('e')) w = startRect.width + dx;
        if (handle.includes('s')) h = startRect.height + dy;
        if (handle.includes('w')) {
          x = startRect.x + dx;
          w = startRect.width - dx;
        }
        if (handle.includes('n')) {
          y = startRect.y + dy;
          h = startRect.height - dy;
        }

        const next = clampRect({ x, y, width: w, height: h });
        latest = next;
        setPreviewRect(next);
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        setPreviewRect(null);
        if (latest) onCommitRect(latest);
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [block.rect, canvasRef, onCommitRect, onSelect],
  );

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent) => {
      event.stopPropagation();
      onStartEditing();
    },
    [onStartEditing],
  );

  // When entering editing mode, autofocus the inner editable.
  useEffect(() => {
    if (!isEditing) return;
    const el = wrapperRef.current?.querySelector<HTMLElement>('[role="textbox"][contenteditable="true"]');
    el?.focus();
  }, [isEditing]);

  const alignClass = ALIGN_CLASS[block.align];

  return (
    <div
      ref={wrapperRef}
      data-block-id={block.id}
      data-align={block.align}
      style={style}
      onMouseDown={(event) => {
        if (isEditing) return;
        beginDrag(event);
      }}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'group select-none',
        isSelected ? 'ring-2 ring-brand/50' : 'ring-1 ring-transparent hover:ring-1 hover:ring-white/10',
        !isEditing && 'cursor-move',
      )}
    >
      {/* Content, with auto-shrink so it never overflows the block */}
      <div className="pointer-events-auto absolute inset-0 overflow-hidden" onDoubleClick={handleDoubleClick}>
        <AutoShrinkText signal={`${block.kind}-${block.rect.width}-${block.rect.height}`}>
          <BlockContent block={block} onContentChange={onContentChange} align={alignClass} isEditing={isEditing} onBlur={onExitEditing} />
        </AutoShrinkText>
      </div>

      {isSelected && (
        <>
          {/* Corner + edge resize handles */}
          <Handle handle="nw" onMouseDown={beginResize('nw')} />
          <Handle handle="n" onMouseDown={beginResize('n')} />
          <Handle handle="ne" onMouseDown={beginResize('ne')} />
          <Handle handle="w" onMouseDown={beginResize('w')} />
          <Handle handle="e" onMouseDown={beginResize('e')} />
          <Handle handle="sw" onMouseDown={beginResize('sw')} />
          <Handle handle="s" onMouseDown={beginResize('s')} />
          <Handle handle="se" onMouseDown={beginResize('se')} />

          {/* Kind badge and quick actions */}
          <div className="absolute -top-9 left-0 flex items-center gap-1 pointer-events-auto">
            <div className="relative">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setKindMenuOpen((v) => !v);
                }}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-white/[0.08] bg-surface-3 px-2 text-[11px] font-medium text-ink shadow-[0_6px_14px_-4px_rgba(0,0,0,0.6)] hover:bg-white/[0.06]"
              >
                {BLOCK_KIND_META[block.kind].label}
                <Icon name="chevron-down" size={10} />
              </button>
              {kindMenuOpen && (
                <div className="relative">
                  <BlockKindMenu
                    anchor="below"
                    selectedKind={block.kind}
                    onSelect={(kind) => {
                      setKindMenuOpen(false);
                      onChangeKind(kind);
                    }}
                    onClose={() => setKindMenuOpen(false)}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDuplicate();
              }}
              title="Duplicar"
              aria-label="Duplicar"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-surface-3 text-ink-secondary hover:bg-white/[0.06] hover:text-ink"
            >
              <Icon name="templates" size={11} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              title="Remover"
              aria-label="Remover"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-surface-3 text-ink-secondary hover:bg-[#ff8a8a]/10 hover:text-[#ff8a8a]"
            >
              <Icon name="trash" size={11} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const HANDLE_STYLE: Record<Handle, { className: string; cursor: string }> = {
  nw: { className: '-top-1 -left-1', cursor: 'nwse-resize' },
  n: { className: '-top-1 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
  ne: { className: '-top-1 -right-1', cursor: 'nesw-resize' },
  w: { className: 'top-1/2 -left-1 -translate-y-1/2', cursor: 'ew-resize' },
  e: { className: 'top-1/2 -right-1 -translate-y-1/2', cursor: 'ew-resize' },
  sw: { className: '-bottom-1 -left-1', cursor: 'nesw-resize' },
  s: { className: '-bottom-1 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
  se: { className: '-bottom-1 -right-1', cursor: 'nwse-resize' },
};

function Handle({ handle, onMouseDown }: { handle: Handle; onMouseDown: (event: ReactMouseEvent) => void }) {
  const meta = HANDLE_STYLE[handle];
  return (
    <div
      role="presentation"
      onMouseDown={onMouseDown}
      className={cn(
        'absolute h-2.5 w-2.5 rounded-[2px] bg-brand ring-2 ring-app-bg shadow-[0_0_6px_rgba(45,219,96,0.4)]',
        meta.className,
      )}
      style={{ cursor: meta.cursor }}
    />
  );
}

interface BlockContentProps {
  block: Block;
  onContentChange: (patch: Partial<Block>) => void;
  align: string;
  isEditing: boolean;
  onBlur: () => void;
}

function BlockContent({ block, onContentChange, align, isEditing, onBlur }: BlockContentProps) {
  const typo = typographyClassFor(block.kind);
  const editingProps = {
    // Only allow text editing while explicitly in editing mode. Otherwise pointer
    // events pass through to the block wrapper so drag and select still work.
    style: { pointerEvents: (isEditing ? 'auto' : 'none') as 'auto' | 'none' },
  };

  if (block.kind === 'bullets') {
    return <BulletsBlockView block={block} align={align} onContentChange={onContentChange} isEditing={isEditing} onBlur={onBlur} editingProps={editingProps} />;
  }

  if (block.kind === 'highlight') {
    return (
      <div
        className="max-w-full border-l-2 pl-5"
        style={{ borderColor: 'rgba(9,232,128,0.6)', pointerEvents: editingProps.style.pointerEvents }}
      >
        <RichEditable
          value={block.content}
          onCommit={(next) => onContentChange({ content: next })}
          placeholder={BLOCK_KIND_META[block.kind].label}
          multiline
          className={cn(typo, align, 'px-0')}
          ariaLabel="Bloco de destaque"
          onBlur={onBlur}
        />
      </div>
    );
  }

  if (block.kind === 'section-label') {
    return (
      <div {...editingProps}>
        <RichEditable
          value={block.content}
          onCommit={(next) => onContentChange({ content: next })}
          placeholder="Rótulo"
          className={cn(typo, align)}
          ariaLabel="Bloco de rótulo"
          style={{ color: 'var(--color-slide-hl)' }}
          onBlur={onBlur}
        />
      </div>
    );
  }

  return (
    <div {...editingProps}>
      <RichEditable
        value={block.content}
        onCommit={(next) => onContentChange({ content: next })}
        placeholder={BLOCK_KIND_META[block.kind].label}
        multiline={block.kind === 'body'}
        className={cn(typo, align)}
        ariaLabel={`Bloco de ${BLOCK_KIND_META[block.kind].label.toLowerCase()}`}
        onBlur={onBlur}
      />
    </div>
  );
}

interface BulletsBlockViewProps {
  block: BulletsBlock;
  align: string;
  onContentChange: (patch: Partial<TextBlock | BulletsBlock>) => void;
  isEditing: boolean;
  onBlur: () => void;
  editingProps: { style: { pointerEvents: 'auto' | 'none' } };
}

/**
 * Bullets são a matéria-prima de TRÊS formatos visuais (espelham a arte final):
 * 2-3 itens viram CARDS lado a lado, 4+ viram LINHAS com número-índice, 1 vira
 * lista simples. Assim o storyboard já mostra a variação que o deck final terá.
 */
function BulletsBlockView({ block, align, onContentChange, isEditing, onBlur, editingProps }: BulletsBlockViewProps) {
  const items = block.items.length === 0 ? [[]] : block.items;
  const presentation = bulletsPresentation(items.length);

  const update = useCallback(
    (index: number, value: RichText) => {
      const base = block.items.length === 0 ? [[]] : block.items;
      const next = [...base];
      if (isEmpty(value) && next.length > 1) next.splice(index, 1);
      else next[index] = value;
      onContentChange({ items: next });
    },
    [block.items, onContentChange],
  );

  const addItem = useCallback(() => {
    const base = block.items.length === 0 ? [[]] : block.items;
    onContentChange({ items: [...base, []] });
  }, [block.items, onContentChange]);

  const addButton = isEditing && (
    <button
      type="button"
      onClick={addItem}
      className="mt-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-[12px] font-medium text-ink-muted transition-colors duration-150 hover:bg-white/[0.03] hover:text-ink"
    >
      <Icon name="plus" size={11} />
      Novo Tópico
    </button>
  );

  if (presentation === 'cards') {
    return (
      <div {...editingProps}>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item, index) => (
            <div
              key={index}
              className="flex flex-col gap-2.5 rounded-2xl border border-white/[0.09] bg-white/[0.02] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <span className="font-mono text-[15px] font-bold leading-none" style={{ color: 'var(--color-slide-hl)' }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span aria-hidden="true" className="h-px w-8" style={{ background: 'rgba(9,232,128,0.35)' }} />
              <RichEditable
                value={item}
                onCommit={(v) => update(index, v)}
                placeholder="Escreve o card"
                multiline
                className="text-[15px] leading-[1.5]"
                ariaLabel={`Card ${index + 1}`}
                onBlur={onBlur}
              />
            </div>
          ))}
        </div>
        {addButton}
      </div>
    );
  }

  if (presentation === 'rows') {
    return (
      <div {...editingProps}>
        <ul className={cn('flex flex-col', align)}>
          {items.map((item, index) => (
            <li
              key={index}
              className={cn('flex items-center gap-5 py-2.5', index > 0 && 'border-t border-white/[0.07]')}
            >
              <span
                className="w-10 flex-none font-mono text-[19px] font-bold leading-none"
                style={{ color: 'var(--color-slide-hl)' }}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <RichEditable
                value={item}
                onCommit={(v) => update(index, v)}
                placeholder="Escreve um tópico"
                className="flex-1 text-[15.5px] leading-[1.5]"
                ariaLabel={`Tópico ${index + 1}`}
                onBlur={onBlur}
              />
            </li>
          ))}
        </ul>
        {addButton}
      </div>
    );
  }

  return (
    <div {...editingProps}>
      <ul className={cn('flex flex-col gap-3', align)}>
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <span
              className="mt-[13px] h-1.5 w-1.5 flex-none rounded-full"
              style={{ background: 'var(--color-slide-hl)' }}
            />
            <RichEditable
              value={item}
              onCommit={(v) => update(index, v)}
              placeholder="Escreve um tópico"
              className="flex-1 text-[17px] leading-[1.55]"
              ariaLabel={`Tópico ${index + 1}`}
              onBlur={onBlur}
            />
          </li>
        ))}
      </ul>
      {addButton}
    </div>
  );
}
