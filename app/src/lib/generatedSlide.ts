import { createId } from '@/lib/id';
import type { GeneratedBlock, GeneratedSlide } from '@/types/generated';
import { MAX_CARDS, MAX_TOPICS, type Block, type Slide } from '@/types/slide';

/**
 * Converte a saída do agente (só conteúdo) em blocos reais.
 *
 * Não calcula posição nenhuma, e essa é a diferença. O sistema antigo tinha um
 * "motor de layout em fluxo" que empilhava retângulos pra cada bloco — e a
 * composição por template IGNORAVA todos eles. Eram 150 linhas mantendo uma
 * decisão que ninguém lia. Quem posiciona é o motor de zonas, medindo a arte.
 *
 * O corte de cards/tópicos aparece aqui DE NOVO (o servidor já cortou) porque o
 * front também recebe conteúdo de outros caminhos: import do Notion, "melhorar
 * slide", decks antigos vindos do localStorage. A regra vale pra todos.
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
        return { kind: 'cards', items: b.items.map((i) => ({ title: i.title, body: i.body })) };
      }
      if (b.kind === 'topics') {
        return { kind: 'topics', items: b.items };
      }
      return { kind: b.kind, align: b.align, content: b.content };
    }),
  };
}
