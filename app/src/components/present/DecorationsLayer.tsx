import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { elementByKey } from '@/services/elementsManifest';
import { cn } from '@/lib/cn';
import type { BlockRect, Decoration } from '@/types/slide';

/**
 * Camada de elementos visuais 3D soltos sobre o slide (ver types/slide.ts Decoration).
 * Em modo leitura só renderiza as imagens. Em modo editável, cada elemento vira
 * arrastável (mover) e ganha uma alça de redimensionar + botão de remover quando selecionado.
 *
 * Não usa nenhuma lib de drag — Pointer Events puros, com posição/tamanho sempre em
 * frações (0..1) do container, igual ao BlockRect dos blocos de texto.
 */

interface DecorationsLayerProps {
  decorations: Decoration[];
  editable: boolean;
  onMove: (id: string, rect: BlockRect) => void;
  onDelete: (id: string) => void;
}

export function DecorationsLayer({ decorations, editable, onMove, onDelete }: DecorationsLayerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (decorations.length === 0) return null;

  return (
    <div
      className="absolute inset-0"
      style={{ pointerEvents: editable ? 'auto' : 'none' }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) setSelectedId(null);
      }}
    >
      {decorations.map((decoration) => (
        <DecorationItem
          key={decoration.id}
          decoration={decoration}
          editable={editable}
          selected={selectedId === decoration.id}
          onSelect={() => setSelectedId(decoration.id)}
          onMove={(rect) => onMove(decoration.id, rect)}
          onDelete={() => {
            onDelete(decoration.id);
            setSelectedId(null);
          }}
        />
      ))}
    </div>
  );
}

interface DecorationItemProps {
  decoration: Decoration;
  editable: boolean;
  selected: boolean;
  onSelect: () => void;
  onMove: (rect: BlockRect) => void;
  onDelete: () => void;
}

interface DragState {
  startX: number;
  startY: number;
  rect: BlockRect;
  containerW: number;
  containerH: number;
}

const MIN_SIZE = 0.05;

function DecorationItem({ decoration, editable, selected, onSelect, onMove, onDelete }: DecorationItemProps) {
  const asset = elementByKey(decoration.assetKey);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<DragState | null>(null);

  if (!asset) return null;
  const { rect } = decoration;

  function readContainer(): { w: number; h: number } | null {
    const parent = containerRef.current?.parentElement;
    if (!parent) return null;
    const box = parent.getBoundingClientRect();
    return { w: box.width, h: box.height };
  }

  function handleMoveDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!editable) return;
    event.stopPropagation();
    onSelect();
    const size = readContainer();
    if (!size) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, rect, containerW: size.w, containerH: size.h };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMoveMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / drag.containerW;
    const dy = (event.clientY - drag.startY) / drag.containerH;
    const width = drag.rect.width;
    const height = drag.rect.height;
    const x = Math.max(0, Math.min(1 - width, drag.rect.x + dx));
    const y = Math.max(0, Math.min(1 - height, drag.rect.y + dy));
    onMove({ x, y, width, height });
  }

  function handleMoveUp(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleResizeDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    onSelect();
    const size = readContainer();
    if (!size) return;
    resizeRef.current = { startX: event.clientX, startY: event.clientY, rect, containerW: size.w, containerH: size.h };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleResizeMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = resizeRef.current;
    if (!drag) return;
    // Diagonal única controla largura e altura juntas — os elementos são blobs
    // desenhados em canvas quadrado, então redimensionar livremente distorceria a arte.
    const dxFrac = (event.clientX - drag.startX) / drag.containerW;
    const dyFrac = (event.clientY - drag.startY) / drag.containerH;
    const delta = (dxFrac + dyFrac) / 2;
    const size = Math.max(MIN_SIZE, Math.min(1 - drag.rect.x, 1 - drag.rect.y, drag.rect.width + delta));
    onMove({ x: drag.rect.x, y: drag.rect.y, width: size, height: size });
  }

  function handleResizeUp(event: ReactPointerEvent<HTMLDivElement>) {
    resizeRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div
      ref={containerRef}
      data-decoration-id={decoration.id}
      className="absolute"
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.width * 100}%`,
        height: `${rect.height * 100}%`,
        transform: decoration.rotation ? `rotate(${decoration.rotation}deg)` : undefined,
        touchAction: 'none',
      }}
      onPointerDown={handleMoveDown}
      onPointerMove={handleMoveMove}
      onPointerUp={handleMoveUp}
    >
      <img
        src={asset.src}
        alt=""
        draggable={false}
        className={cn('h-full w-full select-none object-contain', editable && 'cursor-move')}
      />
      {editable && selected && (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-brand/70" />
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            aria-label="Remover elemento"
            className="absolute -right-2.5 -top-2.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-surface-3 text-ink-secondary shadow-[0_4px_10px_rgba(0,0,0,0.4)] transition-colors duration-150 hover:text-ink"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <div
            onPointerDown={handleResizeDown}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-surface-3 bg-brand"
          />
        </>
      )}
    </div>
  );
}
