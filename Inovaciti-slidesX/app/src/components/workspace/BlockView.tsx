import { useCallback, useState } from 'react';
import { RichEditable } from '@/components/workspace/RichEditable';
import { BlockKindMenu } from '@/components/workspace/BlockKindMenu';
import { Icon } from '@/components/ui/Icon';
import { ALIGN_CLASS, typographyClassFor } from '@/lib/blockTypography';
import { isEmpty, type RichText } from '@/lib/richText';
import { cn } from '@/lib/cn';
import { BLOCK_KIND_META } from '@/types/slide';
import type { Block, BulletsBlock, TextBlock } from '@/types/slide';

interface BlockViewProps {
  block: Block;
  isFocused: boolean;
  onFocus: () => void;
  onContentChange: (patch: Partial<Block>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onInsertAfter: (kind: Block['kind']) => void;
  onChangeKind: (kind: Block['kind']) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDrop: () => void;
  dragOver: boolean;
}

export function BlockView(props: BlockViewProps) {
  const { block, isFocused, onFocus, onContentChange, onDelete, onDuplicate, onInsertAfter, onChangeKind, onDragStart, onDragEnter, onDrop, dragOver } = props;

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [kindMenuOpen, setKindMenuOpen] = useState(false);

  const showControls = isFocused;
  const alignClass = ALIGN_CLASS[block.align];

  return (
    <div
      data-block-id={block.id}
      data-align={block.align}
      className={cn(
        'group relative',
        dragOver && 'before:absolute before:-top-2 before:left-0 before:right-0 before:h-0.5 before:rounded-full before:bg-brand',
      )}
      onDragOver={(event) => {
        event.preventDefault();
        onDragEnter();
      }}
      onDrop={onDrop}
    >
      {/* Left gutter with drag handle + kind selector, appears on hover / focus */}
      <div
        className={cn(
          'absolute left-[-52px] top-1 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100',
          showControls && 'opacity-100',
        )}
      >
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => setKindMenuOpen((v) => !v)}
          title="Mudar tipo do bloco (arraste para mover)"
          aria-label="Mudar tipo do bloco"
          className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-white/[0.05] hover:text-ink active:cursor-grabbing"
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
            <circle cx="2.5" cy="2.5" r="1.25" />
            <circle cx="7.5" cy="2.5" r="1.25" />
            <circle cx="2.5" cy="7" r="1.25" />
            <circle cx="7.5" cy="7" r="1.25" />
            <circle cx="2.5" cy="11.5" r="1.25" />
            <circle cx="7.5" cy="11.5" r="1.25" />
          </svg>
        </button>
        {kindMenuOpen && (
          <BlockKindMenu
            anchor="below"
            selectedKind={block.kind}
            onSelect={(kind) => {
              setKindMenuOpen(false);
              onChangeKind(kind);
            }}
            onClose={() => setKindMenuOpen(false)}
          />
        )}
      </div>

      {/* The block content itself */}
      <div className="relative" onMouseDown={onFocus}>
        <BlockContent block={block} onContentChange={onContentChange} align={alignClass} />
      </div>

      {/* Right-side quick actions (visible only when focused) */}
      {showControls && (
        <div className="absolute -right-[52px] top-1 flex items-center gap-0.5">
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicar"
            aria-label="Duplicar bloco"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-white/[0.05] hover:text-ink"
          >
            <Icon name="templates" size={11} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Remover"
            aria-label="Remover bloco"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-[#ff8a8a]/10 hover:text-[#ff8a8a]"
          >
            <Icon name="trash" size={11} />
          </button>
        </div>
      )}

      {/* Add-block affordance below focused block */}
      {showControls && (
        <div className="relative mt-3 h-3">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.04]" />
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={() => setAddMenuOpen((v) => !v)}
              className="inline-flex h-5 items-center gap-1 rounded-full border border-brand/25 bg-app-bg px-2 text-[10px] font-semibold uppercase tracking-widest text-brand transition-colors duration-150 hover:bg-brand/[0.06]"
            >
              <Icon name="plus" size={10} />
              Bloco
            </button>
            {addMenuOpen && (
              <div className="relative">
                <BlockKindMenu
                  anchor="below"
                  onSelect={(kind) => {
                    setAddMenuOpen(false);
                    onInsertAfter(kind);
                  }}
                  onClose={() => setAddMenuOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface BlockContentProps {
  block: Block;
  onContentChange: (patch: Partial<Block>) => void;
  align: string;
}

function BlockContent({ block, onContentChange, align }: BlockContentProps) {
  const commonTypography = typographyClassFor(block.kind);

  if (block.kind === 'bullets') {
    return <BulletsBlockView block={block} align={align} onContentChange={onContentChange} />;
  }

  if (block.kind === 'highlight') {
    return (
      <div className="max-w-full border-l-2 pl-5" style={{ borderColor: 'rgba(9,232,128,0.6)' }}>
        <RichEditable
          value={block.content}
          onCommit={(next) => onContentChange({ content: next })}
          placeholder={BLOCK_KIND_META[block.kind].label}
          multiline
          className={cn(commonTypography, align, 'px-0')}
          ariaLabel="Bloco de destaque"
        />
      </div>
    );
  }

  if (block.kind === 'section-label') {
    return (
      <RichEditable
        value={block.content}
        onCommit={(next) => onContentChange({ content: next })}
        placeholder="Rótulo"
        className={cn(commonTypography, align)}
        ariaLabel="Bloco de rótulo"
        style={{ color: 'var(--color-slide-hl)' }}
      />
    );
  }

  return (
    <RichEditable
      value={block.content}
      onCommit={(next) => onContentChange({ content: next })}
      placeholder={BLOCK_KIND_META[block.kind].label}
      multiline={block.kind === 'body'}
      className={cn(commonTypography, align)}
      ariaLabel={`Bloco de ${BLOCK_KIND_META[block.kind].label.toLowerCase()}`}
    />
  );
}

interface BulletsBlockViewProps {
  block: BulletsBlock;
  align: string;
  onContentChange: (patch: Partial<TextBlock | BulletsBlock>) => void;
}

function BulletsBlockView({ block, align, onContentChange }: BulletsBlockViewProps) {
  const items = block.items.length === 0 ? [[]] : block.items;

  const update = useCallback(
    (index: number, value: RichText) => {
      const base = block.items.length === 0 ? [[]] : block.items;
      const next = [...base];
      if (isEmpty(value) && next.length > 1) {
        next.splice(index, 1);
      } else {
        next[index] = value;
      }
      onContentChange({ items: next });
    },
    [block.items, onContentChange],
  );

  const addItem = useCallback(() => {
    const base = block.items.length === 0 ? [[]] : block.items;
    onContentChange({ items: [...base, []] });
  }, [block.items, onContentChange]);

  return (
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
          />
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-2 -ml-2 rounded-md px-2 py-1 text-[12px] font-medium text-ink-muted transition-colors duration-150 hover:bg-white/[0.03] hover:text-ink"
        >
          <Icon name="plus" size={11} />
          Novo tópico
        </button>
      </li>
    </ul>
  );
}
