import { createId } from '@/lib/id';
import { fromPlain, type RichText } from '@/lib/richText';
import { clampRect } from '@/lib/rect';
import type { Block, BlockAlign, BlockRect, TextBlock, TextBlockKind } from '@/types/slide';

export function makeTextBlock(
  kind: TextBlockKind,
  content: RichText | string = [],
  align: BlockAlign = 'left',
  rect: BlockRect = { x: 0.08, y: 0.2, width: 0.75, height: 0.14 },
): TextBlock {
  return {
    id: createId(),
    kind,
    align,
    content: typeof content === 'string' ? fromPlain(content) : content,
    rect: clampRect(rect),
  };
}

/** Os três tipos de caixa de texto livre que o dock oferece (espelha o Canva). */
export type FloatingTextKind = 'title-2' | 'subtitle' | 'body';

/** Rect de nascimento de cada tipo de caixa: centrada, com largura que lê bem. */
const FLOATING_RECT_FOR: Record<FloatingTextKind, BlockRect> = {
  'title-2': { x: 0.25, y: 0.42, width: 0.5, height: 0.12 },
  subtitle: { x: 0.28, y: 0.46, width: 0.44, height: 0.09 },
  body: { x: 0.3, y: 0.47, width: 0.4, height: 0.1 },
};

/**
 * Caixa de texto livre (estilo Canva). Arrastada do dock, nasce centrada no
 * ponto onde foi solta; clicada, nasce no centro do slide com um deslocamento
 * por caixa existente (inserções seguidas não empilham).
 */
export function makeFloatingTextBlock(kind: FloatingTextKind, offset = 0, at?: { x: number; y: number }): TextBlock {
  const base = FLOATING_RECT_FOR[kind];
  const rect = at
    ? { ...base, x: at.x - base.width / 2, y: at.y - base.height / 2 }
    : { ...base, x: base.x + (offset % 6) * 0.03, y: base.y + (offset % 6) * 0.03 };
  return {
    id: createId(),
    kind,
    align: 'left',
    content: [],
    rect: clampRect(rect),
    floating: true,
  };
}

/** Deep copy a block with a fresh id, preserving all fields including rect. */
export function cloneBlock(block: Block, rectOverride?: BlockRect): Block {
  const rect = clampRect(rectOverride ?? block.rect);
  if (block.kind === 'bullets') {
    return {
      id: createId(),
      kind: 'bullets',
      align: block.align,
      items: block.items.map((item) => item.map((run) => ({ ...run }))),
      rect,
    };
  }
  return {
    id: createId(),
    kind: block.kind,
    align: block.align,
    content: block.content.map((run) => ({ ...run })),
    rect,
    ...(block.floating ? { floating: true } : {}),
  };
}
