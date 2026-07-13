import { createId } from '@/lib/id';
import { clampRect } from '@/lib/rect';
import { isStatementComposition, layoutGeneratedBlocks } from '@/services/slideLayout';
import type { GeneratedBlock, GeneratedSlide } from '@/types/generated';
import type { Block, BlockRect, Slide } from '@/types/slide';

/**
 * Converte a saída do agente (só conteúdo) em blocos reais com posição calculada.
 * Os rects vêm do motor de layout em FLUXO (slideLayout.ts): o slide inteiro é
 * empilhado de uma vez, então blocos nunca nascem um em cima do outro.
 */
function toRealBlocks(layout: Slide['layout'], generated: GeneratedBlock[]): Block[] {
  const rects = layoutGeneratedBlocks(layout, generated);
  const statement = isStatementComposition(layout, generated);
  return generated.map((block, index) => {
    const rect = clampRect(rects[index] ?? { x: 0.1, y: 0.4, width: 0.6, height: 0.2 });
    // Afirmações centrais leem melhor centralizadas, a menos que o agente peça outro alinhamento.
    const align = block.align ?? (statement ? 'center' : 'left');
    return toRealBlock(block, align, rect);
  });
}

function toRealBlock(generated: GeneratedBlock, align: Block['align'], rect: BlockRect): Block {
  if (generated.kind === 'bullets') {
    return { id: createId(), kind: 'bullets', align, items: generated.items, rect };
  }
  return { id: createId(), kind: generated.kind, align, content: generated.content, rect };
}

/** Converte um slide gerado pela IA (sem id/rect) num Slide real, pronto pro presentationsStore. */
export function fromGeneratedSlide(generated: GeneratedSlide): Slide {
  return {
    id: createId(),
    layout: generated.layout,
    blocks: toRealBlocks(generated.layout, generated.blocks),
  };
}

/** Aplica blocks gerados por IA a um slide já existente, preservando id e layout (usado por "Melhorar"). */
export function applyGeneratedBlocksToSlide(slide: Slide, blocks: GeneratedBlock[]): Slide {
  return {
    ...slide,
    blocks: toRealBlocks(slide.layout, blocks),
  };
}

/** Converte um Slide real de volta pro formato "só conteúdo" que a API espera como contexto. */
export function toGeneratedSlide(slide: Slide): GeneratedSlide {
  return {
    layout: slide.layout,
    blocks: slide.blocks.map((b): GeneratedBlock => {
      if (b.kind === 'bullets') {
        return { kind: 'bullets', align: b.align, items: b.items };
      }
      return { kind: b.kind, align: b.align, content: b.content };
    }),
  };
}
