import { createId } from '@/lib/id';
import { fromPlain, type RichText } from '@/lib/richText';
import { clampRect } from '@/lib/rect';
import type { Block, BlockAlign, BlockRect, BulletsBlock, TextBlock, TextBlockKind } from '@/types/slide';

/** Sensible default rects when the user adds a fresh block. Chosen so the block lands
 * visibly on the slide with a size that reads well for that kind of content. */
export const DEFAULT_RECT_FOR: Record<Block['kind'], BlockRect> = {
  'title-1': { x: 0.08, y: 0.35, width: 0.75, height: 0.22 },
  'title-2': { x: 0.08, y: 0.20, width: 0.75, height: 0.14 },
  'title-3': { x: 0.08, y: 0.36, width: 0.55, height: 0.10 },
  subtitle: { x: 0.08, y: 0.30, width: 0.60, height: 0.08 },
  body: { x: 0.10, y: 0.45, width: 0.60, height: 0.25 },
  bullets: { x: 0.08, y: 0.42, width: 0.72, height: 0.48 },
  highlight: { x: 0.08, y: 0.42, width: 0.72, height: 0.22 },
  'section-label': { x: 0.08, y: 0.15, width: 0.40, height: 0.06 },
};

export function makeTextBlock(
  kind: TextBlockKind,
  content: RichText | string = [],
  align: BlockAlign = 'left',
  rect: BlockRect = DEFAULT_RECT_FOR[kind],
): TextBlock {
  return {
    id: createId(),
    kind,
    align,
    content: typeof content === 'string' ? fromPlain(content) : content,
    rect: clampRect(rect),
  };
}

export function makeBulletsBlock(
  items: (RichText | string)[] = [],
  align: BlockAlign = 'left',
  rect: BlockRect = DEFAULT_RECT_FOR.bullets,
): BulletsBlock {
  return {
    id: createId(),
    kind: 'bullets',
    align,
    items: items.map((item) => (typeof item === 'string' ? fromPlain(item) : item)),
    rect: clampRect(rect),
  };
}

/** Same as makeEmptyBlockOfKind but nudges the rect down/right so consecutive inserts
 * don't stack on top of each other. Callers pass an incrementing offset (0, 1, 2, ...). */
export function makeEmptyBlockOfKind(kind: Block['kind'], offset = 0): Block {
  const base = DEFAULT_RECT_FOR[kind];
  const shifted = clampRect({
    ...base,
    x: base.x + offset * 0.03,
    y: base.y + offset * 0.03,
  });
  if (kind === 'bullets') return makeBulletsBlock([[]], 'left', shifted);
  return makeTextBlock(kind, [], 'left', shifted);
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
  };
}
