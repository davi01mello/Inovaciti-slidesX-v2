import { createId } from '@/lib/id';
import type { GeneratedBlock, GeneratedSlide } from '@/types/generated';
import {
  MAX_CARDS,
  MAX_COMPARE_POINTS,
  MAX_STATS,
  MAX_STEPS,
  MAX_TOPICS,
  type Block,
  type Slide,
} from '@/types/slide';

/**
 * Converte a saída do agente (só conteúdo) em blocos reais.
 *
 * Não calcula posição nenhuma, e essa é a diferença. O sistema antigo tinha um
 * "motor de layout em fluxo" que empilhava retângulos pra cada bloco — e a
 * composição por template IGNORAVA todos eles. Eram 150 linhas mantendo uma
 * decisão que ninguém lia. Quem posiciona é o motor de zonas, medindo a arte.
 *
 * O corte das listas aparece aqui DE NOVO (o servidor já cortou) porque o front
 * também recebe conteúdo de outros caminhos: import do Notion, "melhorar slide",
 * decks antigos vindos do localStorage. A regra vale pra todos.
 */
function toRealBlocks(generated: GeneratedBlock[]): Block[] {
  return generated.map((block): Block => {
    if (block.kind === 'cards') {
      return {
        id: createId(),
        kind: 'cards',
        align: 'left',
        items: block.items.slice(0, MAX_CARDS).map((card) => ({
          id: createId(),
          title: card.title,
          body: card.body,
          ...(card.icon ? { icon: card.icon } : {}),
        })),
      };
    }
    if (block.kind === 'topics') {
      return {
        id: createId(),
        kind: 'topics',
        align: 'left',
        items: block.items.slice(0, MAX_TOPICS),
      };
    }
    if (block.kind === 'stats') {
      return {
        id: createId(),
        kind: 'stats',
        align: 'left',
        items: block.items.slice(0, MAX_STATS).map((stat) => ({
          id: createId(),
          value: stat.value,
          label: stat.label,
          ...(stat.icon ? { icon: stat.icon } : {}),
        })),
      };
    }
    if (block.kind === 'steps') {
      const items = block.items.slice(0, MAX_STEPS);
      return {
        id: createId(),
        kind: 'steps',
        align: 'left',
        items,
        ...(block.icons && block.icons.length > 0
          ? { icons: items.map((_, i) => block.icons?.[i] ?? null) }
          : {}),
      };
    }
    if (block.kind === 'compare') {
      return {
        id: createId(),
        kind: 'compare',
        align: 'left',
        sides: block.sides.slice(0, 2).map((side) => ({
          id: createId(),
          label: side.label,
          points: side.points.slice(0, MAX_COMPARE_POINTS),
          ...(side.icon ? { icon: side.icon } : {}),
        })),
      };
    }
    return {
      id: createId(),
      kind: block.kind,
      align: block.align ?? 'left',
      content: block.content,
    };
  });
}

export function fromGeneratedSlide(generated: GeneratedSlide): Slide {
  return {
    id: createId(),
    layout: generated.layout,
    blocks: toRealBlocks(generated.blocks),
  };
}

/** Aplica blocos gerados a um slide existente, preservando id, layout e a foto. */
export function applyGeneratedBlocksToSlide(slide: Slide, blocks: GeneratedBlock[]): Slide {
  return { ...slide, blocks: toRealBlocks(blocks) };
}

/** Converte um Slide real de volta pro formato "só conteúdo" que a API espera como contexto. */
export function toGeneratedSlide(slide: Slide): GeneratedSlide {
  return {
    layout: slide.layout,
    blocks: slide.blocks.map((b): GeneratedBlock => {
      if (b.kind === 'cards') {
        return {
          kind: 'cards',
          items: b.items.map((i) => ({ title: i.title, body: i.body, ...(i.icon ? { icon: i.icon } : {}) })),
        };
      }
      if (b.kind === 'topics') {
        return { kind: 'topics', items: b.items };
      }
      if (b.kind === 'stats') {
        return {
          kind: 'stats',
          items: b.items.map((i) => ({ value: i.value, label: i.label, ...(i.icon ? { icon: i.icon } : {}) })),
        };
      }
      if (b.kind === 'steps') {
        return { kind: 'steps', items: b.items };
      }
      if (b.kind === 'compare') {
        return {
          kind: 'compare',
          sides: b.sides.map((s) => ({ label: s.label, points: s.points, ...(s.icon ? { icon: s.icon } : {}) })),
        };
      }
      return { kind: b.kind, align: b.align, content: b.content };
    }),
  };
}
