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
        ...(item.iconAsset ? { iconAsset: item.iconAsset } : {}),
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
        ...(item.iconAsset ? { iconAsset: item.iconAsset } : {}),
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
        ...(side.iconAsset ? { iconAsset: side.iconAsset } : {}),
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

/** Os cinco formatos estruturados que o dock oferece pra inserção manual (espelha isListBlock). */
export type ListBlockKind = 'topics' | 'cards' | 'stats' | 'steps' | 'compare';

/**
 * Nasce com 2-3 itens placeholder, prontos pra editar na hora — mesmo texto de
 * placeholder que addTopic/addCard/etc já usam (SlideComposition.tsx), pra não
 * inventar um segundo vocabulário de "item novo" no produto.
 *
 * Sem rect: como todo bloco do fluxo, quem posiciona é o motor de zonas
 * (services/artZones.ts) — o arquétipo do slide é INFERIDO destes blocos
 * (services/slideArchetype.ts), então inserir um destes muda o desenho do
 * slide na hora, automaticamente, tanto num slide manual quanto num gerado.
 */
export function makeListBlock(kind: ListBlockKind): Block {
  switch (kind) {
    case 'topics':
      return {
        id: createId(),
        kind: 'topics',
        align: 'left',
        items: [fromPlain('Novo tópico'), fromPlain('Novo tópico'), fromPlain('Novo tópico')],
      };
    case 'steps':
      return {
        id: createId(),
        kind: 'steps',
        align: 'left',
        items: [fromPlain('Nova etapa'), fromPlain('Nova etapa'), fromPlain('Nova etapa')],
      };
    case 'cards':
      return {
        id: createId(),
        kind: 'cards',
        align: 'left',
        items: [
          { id: createId(), title: fromPlain('Novo card'), body: fromPlain('') },
          { id: createId(), title: fromPlain('Novo card'), body: fromPlain('') },
        ],
      };
    case 'stats':
      return {
        id: createId(),
        kind: 'stats',
        align: 'left',
        items: [
          { id: createId(), value: fromPlain('0'), label: fromPlain('Nova métrica') },
          { id: createId(), value: fromPlain('0'), label: fromPlain('Nova métrica') },
        ],
      };
    case 'compare':
      return {
        id: createId(),
        kind: 'compare',
        align: 'left',
        sides: [
          { id: createId(), label: fromPlain('Lado A'), points: [fromPlain('Novo ponto')] },
          { id: createId(), label: fromPlain('Lado B'), points: [fromPlain('Novo ponto')] },
        ],
      };
  }
}
