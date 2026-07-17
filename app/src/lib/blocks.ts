import { createId } from '@/lib/id';
import { fromPlain, type RichText } from '@/lib/richText';
import { clampRect } from '@/lib/rect';
import type { Block, BlockAlign, BlockRect, TextBlock, TextBlockKind } from '@/types/slide';

/** Texto do FLUXO do template: sem rect. Quem o posiciona é o motor de zonas. */
export function makeTextBlock(
  kind: TextBlockKind,
  content: RichText | string = [],
  align: BlockAlign = 'left',
): TextBlock {
  return {
    id: createId(),
    kind,
    align,
    content: typeof content === 'string' ? fromPlain(content) : content,
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
 * Caixa de texto LIVRE (estilo Canva). Esta sim tem rect: ela vive fora do fluxo
 * do template e é o usuário quem decide onde ela fica.
 */
export function makeFloatingTextBlock(
  kind: FloatingTextKind,
  offset = 0,
  at?: { x: number; y: number },
): TextBlock {
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

const cloneRich = (rich: RichText): RichText => rich.map((run) => ({ ...run }));

/** Cópia profunda com id novo. */
export function cloneBlock(block: Block, rectOverride?: BlockRect): Block {
  if (block.kind === 'cards') {
    return {
      id: createId(),
      kind: 'cards',
      align: block.align,
      items: block.items.map((item) => ({
        id: createId(),
        title: cloneRich(item.title),
        body: cloneRich(item.body),
        ...(item.icon ? { icon: item.icon } : {}),
        ...(item.marker ? { marker: cloneRich(item.marker) } : {}),
      })),
    };
  }
  if (block.kind === 'topics' || block.kind === 'steps') {
    return {
      id: createId(),
      kind: block.kind,
      align: block.align,
      items: block.items.map(cloneRich),
      ...(block.markers ? { markers: block.markers.map(cloneRich) } : {}),
    };
  }
  if (block.kind === 'stats') {
    return {
      id: createId(),
      kind: 'stats',
      align: block.align,
      items: block.items.map((item) => ({
        id: createId(),
        value: cloneRich(item.value),
        label: cloneRich(item.label),
        ...(item.icon ? { icon: item.icon } : {}),
      })),
    };
  }
  if (block.kind === 'compare') {
    return {
      id: createId(),
      kind: 'compare',
      align: block.align,
      sides: block.sides.map((side) => ({
        id: createId(),
        label: cloneRich(side.label),
        points: side.points.map(cloneRich),
        ...(side.icon ? { icon: side.icon } : {}),
      })),
    };
  }
  const rect = rectOverride ?? block.rect;
  return {
    id: createId(),
    kind: block.kind,
    align: block.align,
    content: cloneRich(block.content),
    ...(rect ? { rect: clampRect(rect) } : {}),
    ...(block.floating ? { floating: true } : {}),
  };
}
