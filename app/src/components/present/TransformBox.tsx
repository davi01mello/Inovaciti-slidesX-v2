import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { BlockRect } from '@/types/slide';

/**
 * Moldura de transformação — a peça de manipulação direta do editor, usada por
 * TODA camada livre do slide (caixas de texto e elementos/imagens).
 *
 * Liberdade total, como no Canva: arrasta pelo corpo pra mover, e as OITO alças
 * redimensionam — os quatro cantos e também os quatro lados (esquerda, direita,
 * topo, base), então dá pra espremer ou esticar em qualquer eixo.
 * `lockAspectOnCorners` mantém a proporção da arte nos cantos (o gesto padrão
 * nunca distorce uma imagem), enquanto os lados continuam livres.
 */

export type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLES: { dir: HandleDir; className: string; cursor: string; edge: boolean }[] = [
  { dir: 'nw', className: '-left-1 -top-1', cursor: 'nwse-resize', edge: false },
  { dir: 'ne', className: '-right-1 -top-1', cursor: 'nesw-resize', edge: false },
  { dir: 'se', className: '-right-1 -bottom-1', cursor: 'nwse-resize', edge: false },
  { dir: 'sw', className: '-left-1 -bottom-1', cursor: 'nesw-resize', edge: false },
  { dir: 'n', className: 'left-1/2 -top-1 -translate-x-1/2', cursor: 'ns-resize', edge: true },
  { dir: 's', className: 'left-1/2 -bottom-1 -translate-x-1/2', cursor: 'ns-resize', edge: true },
  { dir: 'w', className: '-left-1 top-1/2 -translate-y-1/2', cursor: 'ew-resize', edge: true },
  { dir: 'e', className: '-right-1 top-1/2 -translate-y-1/2', cursor: 'ew-resize', edge: true },
];

interface DragState {
  startX: number;
  startY: number;
  rect: BlockRect;
  stageW: number;
  stageH: number;
  dir?: HandleDir;
  /** A caixa já estava selecionada quando este gesto começou? (define se o
   * clique "entra no conteúdo" — o primeiro clique só seleciona, como no Canva.) */
  wasSelected: boolean;
}

/** Que camada é dona desta caixa — as camadas usam isso pra saber quando limpar a seleção. */
export type TransformKind = 'text' | 'decoration' | 'zone';

interface TransformBoxProps {
  kind: TransformKind;
  rect: BlockRect;
  onChange: (rect: BlockRect) => void;
  /** Modo edição do slide: sem isso, é só um contêiner posicionado (leitura/export). */
  interactive: boolean;
  selected: boolean;
  onSelect: () => void;
  /** Clique sem arrasto numa caixa JÁ selecionada (o gesto de "entrar no conteúdo"). */
  onActivate?: () => void;
  onDelete?: () => void;
  /** Congela mover/redimensionar (ex.: caixa de texto em edição de conteúdo). */
  frozen?: boolean;
  /** Cantos preservam a proporção da arte; os lados seguem livres. */
  lockAspectOnCorners?: boolean;
  /**
   * Arrastar pelo corpo move a caixa. Desligue quando o corpo precisa continuar
   * clicável/selecionável (a área de conteúdo do template envolve textos
   * editáveis) — aí o movimento sai pela alça de mover (`grip`).
   */
  bodyDraggable?: boolean;
  grip?: boolean;
  /** Aparência da moldura: verde da marca (item selecionado) ou tracejada discreta (área). */
  tone?: 'brand' | 'subtle';
  /**
   * Moldura e alças só aparecem sob o ponteiro (ou durante o arrasto). É como a
   * área de conteúdo do template se comporta: ela está sempre "ativa", mas não
   * pode ficar com oito alças cravadas na tela o tempo todo.
   */
  revealOnHover?: boolean;
  /** Botões extras ao lado da alça de mover (ex.: restaurar posição padrão). */
  chrome?: ReactNode;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function TransformBox({
  kind,
  rect,
  onChange,
  interactive,
  selected,
  onSelect,
  onActivate,
  onDelete,
  frozen = false,
  lockAspectOnCorners = false,
  bodyDraggable = true,
  grip = false,
  tone = 'brand',
  revealOnHover = false,
  chrome,
  minWidth = 0.05,
  minHeight = 0.04,
  className,
  style,
  children,
}: TransformBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const frameStyle: CSSProperties = {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
    ...style,
  };

  if (!interactive) {
    return (
      <div className={cn('absolute', className)} style={frameStyle}>
        {children}
      </div>
    );
  }

  function readStage(): { w: number; h: number } | null {
    const stage = boxRef.current?.closest('[data-slide-stage]') as HTMLElement | null;
    if (!stage) return null;
    const box = stage.getBoundingClientRect();
    return { w: box.width, h: box.height };
  }

  function beginDrag(event: ReactPointerEvent, dir?: HandleDir) {
    if (frozen) return;
    const stage = readStage();
    if (!stage) return;
    event.stopPropagation();
    movedRef.current = false;
    setDragging(true);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      rect,
      stageW: stage.w,
      stageH: stage.h,
      dir,
      wasSelected: selected,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / drag.stageW;
    const dy = (event.clientY - drag.startY) / drag.stageH;
    if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) movedRef.current = true;
    onChange(drag.dir ? resize(drag.rect, drag.dir, dx, dy) : move(drag.rect, dx, dy));
  }

  function move(base: BlockRect, dx: number, dy: number): BlockRect {
    return {
      x: clamp(base.x + dx, 0, 1 - base.width),
      y: clamp(base.y + dy, 0, 1 - base.height),
      width: base.width,
      height: base.height,
    };
  }

  function resize(base: BlockRect, dir: HandleDir, dx: number, dy: number): BlockRect {
    const isCorner = dir.length === 2;

    if (isCorner && lockAspectOnCorners) {
      // A proporção manda: um único fator de escala move os dois eixos juntos,
      // ancorado no canto oposto ao que está sendo arrastado.
      const ratio = base.height / base.width;
      const signX = dir.includes('e') ? 1 : -1;
      const signY = dir.includes('s') ? 1 : -1;
      const delta = (dx * signX + (dy * signY) / ratio) / 2;
      const anchorX = dir.includes('w') ? base.x + base.width : base.x;
      const anchorY = dir.includes('n') ? base.y + base.height : base.y;
      const maxWidth = Math.min(
        dir.includes('w') ? anchorX : 1 - anchorX,
        (dir.includes('n') ? anchorY : 1 - anchorY) / ratio,
      );
      const width = clamp(base.width + delta, minWidth, Math.max(minWidth, maxWidth));
      const height = width * ratio;
      return {
        x: dir.includes('w') ? anchorX - width : anchorX,
        y: dir.includes('n') ? anchorY - height : anchorY,
        width,
        height,
      };
    }

    let { x, y, width, height } = base;
    const right = base.x + base.width;
    const bottom = base.y + base.height;
    if (dir.includes('e')) width = clamp(base.width + dx, minWidth, 1 - base.x);
    if (dir.includes('s')) height = clamp(base.height + dy, minHeight, 1 - base.y);
    if (dir.includes('w')) {
      x = clamp(base.x + dx, 0, right - minWidth);
      width = right - x;
    }
    if (dir.includes('n')) {
      y = clamp(base.y + dy, 0, bottom - minHeight);
      height = bottom - y;
    }
    return { x, y, width, height };
  }

  function handlePointerUp(event: ReactPointerEvent) {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    // Clique parado numa caixa que JÁ estava selecionada: o gesto de entrar no
    // conteúdo. O primeiro clique apenas seleciona (e revela as alças).
    if (drag && !drag.dir && !movedRef.current && drag.wasSelected) onActivate?.();
  }

  // Só quem arrasta pelo corpo bloqueia a seleção de texto: a área de conteúdo
  // envolve textos editáveis e precisa deixar o usuário selecionar palavras.
  const dragsByBody = bodyDraggable && !frozen;
  const showChrome = selected && (!revealOnHover || hovered || dragging);

  return (
    <div
      ref={boxRef}
      data-transform-box={kind}
      className={cn('pointer-events-auto absolute', dragsByBody && 'cursor-move select-none', className)}
      style={{ ...frameStyle, touchAction: dragsByBody ? 'none' : undefined }}
      onPointerDown={(event) => {
        onSelect();
        if (bodyDraggable) beginDrag(event);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={revealOnHover ? () => setHovered(true) : undefined}
      onPointerLeave={revealOnHover ? () => setHovered(false) : undefined}
    >
      {children}

      {showChrome && (
        <>
          <div
            className={cn(
              'pointer-events-none absolute -inset-1.5 rounded-md border transition-colors duration-150',
              tone === 'subtle' ? 'border-dashed border-white/[0.16]' : frozen ? 'border-brand/35' : 'border-brand/70',
            )}
          />
          {!frozen && (
            <>
              {HANDLES.map(({ dir, className: pos, cursor, edge }) => (
                <div
                  key={dir}
                  onPointerDown={(event) => beginDrag(event, dir)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  aria-label={`Redimensionar (${dir})`}
                  className={cn(
                    'absolute z-10 rounded-full border-2 border-[#0A1210] bg-brand shadow-[0_2px_6px_rgba(0,0,0,0.45)] transition-transform duration-100 hover:scale-125',
                    // Alças de lado são cápsulas alinhadas à borda; as de canto, bolinhas.
                    edge ? (dir === 'n' || dir === 's' ? 'h-2 w-5' : 'h-5 w-2') : 'h-2.5 w-2.5',
                    pos,
                  )}
                  style={{ cursor, touchAction: 'none' }}
                />
              ))}

              {grip && (
                <div
                  onPointerDown={(event) => beginDrag(event)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  title="Mover área de texto"
                  aria-label="Mover área de texto"
                  className="absolute -left-2.5 -top-8 z-10 flex h-6 w-6 cursor-move items-center justify-center rounded-md border border-white/20 bg-surface-3 text-ink-secondary shadow-[0_4px_10px_rgba(0,0,0,0.4)] transition-colors duration-150 hover:text-ink"
                  style={{ touchAction: 'none' }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <circle cx="6" cy="5" r="1.4" />
                    <circle cx="14" cy="5" r="1.4" />
                    <circle cx="6" cy="10" r="1.4" />
                    <circle cx="14" cy="10" r="1.4" />
                    <circle cx="6" cy="15" r="1.4" />
                    <circle cx="14" cy="15" r="1.4" />
                  </svg>
                </div>
              )}
              {chrome}

              {onDelete && (
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete();
                  }}
                  aria-label="Remover"
                  className="absolute -right-2.5 -top-7 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-surface-3 text-ink-secondary shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
