import { toPlain } from '@/lib/richText';
import type { RichText } from '@/lib/richText';
import type { Block, BulletsBlock, Slide, TextBlock } from '@/types/slide';

/**
 * Motor de composição de template do CITi Slides.
 *
 * Cada slide é composto SOBRE um template visual fixo (os fundos em
 * assets/templates), e não mais rasterizado por IA. Este módulo é a parte pura
 * do motor: decide qual arquétipo de template o slide pede e mapeia cada bloco
 * de conteúdo pro papel semântico que ele ocupa dentro do template
 * (título-herói, rótulo, cards, linhas, destaque...).
 *
 * As regras espelham as que o seletor de referências da geração por imagem
 * usava (cover/section/cards/rows/statement/bignumber), então decks antigos
 * caem nos mesmos formatos que a arte final gerava.
 */

export type TemplateArchetype = 'cover' | 'statement' | 'cards' | 'rows' | 'bignumber';

export interface ComposedSlide {
  archetype: TemplateArchetype;
  /** Rótulo pequeno em maiúsculas (section-label). */
  label: TextBlock | null;
  /** Título principal do slide (primeiro title-1/title-2). */
  headline: TextBlock | null;
  /** Valor curto em destaque no arquétipo bignumber (ex.: "R$ 29.900"). */
  metric: TextBlock | null;
  /** Textos de apoio na ordem em que o autor escreveu (subtítulo, corpo...). */
  support: TextBlock[];
  /** Itens de lista que viram cards ou linhas do template. */
  items: RichText[];
  /** Frase de destaque: vira a faixa de fecho do template. */
  highlight: TextBlock | null;
}

function isTitle(block: Block): block is TextBlock {
  return block.kind === 'title-1' || block.kind === 'title-2';
}

/** Valor curto com dígito (preço, métrica, percentual) que pede o número gigante. */
function isShortMetric(block: TextBlock): boolean {
  const text = toPlain(block.content).trim();
  return text.length > 0 && text.length <= 16 && /\d/.test(text);
}

function pickArchetype(slide: Slide, maxItems: number, metric: TextBlock | null): TemplateArchetype {
  switch (slide.layout) {
    case 'cover':
    case 'closing':
      return 'cover';
    case 'section':
      return 'statement';
    default: {
      // 4+ itens não cabem em cards lado a lado sem espremer: linhas horizontais.
      if (maxItems >= 4) return 'rows';
      if (maxItems >= 2) return 'cards';
      if (maxItems === 1) return 'rows';
      if (metric) return 'bignumber';
      return 'statement';
    }
  }
}

/** Analisa o slide e devolve o plano de composição sobre o template. */
export function composeSlide(slide: Slide): ComposedSlide {
  const bulletBlocks = slide.blocks.filter((b): b is BulletsBlock => b.kind === 'bullets');
  const items = bulletBlocks.flatMap((b) => b.items).filter((item) => toPlain(item).trim().length > 0);

  const label = slide.blocks.find((b): b is TextBlock => b.kind === 'section-label') ?? null;
  const highlight = slide.blocks.find((b): b is TextBlock => b.kind === 'highlight') ?? null;

  const titles = slide.blocks.filter(isTitle);
  let metric: TextBlock | null = null;
  let headline: TextBlock | null = null;
  if (slide.layout === 'content' && items.length === 0) {
    metric = titles.find(isShortMetric) ?? null;
  }
  headline = titles.find((t) => t !== metric) ?? null;
  // Sem outro título por perto, o valor curto é o próprio título (não vira métrica).
  if (!headline && metric) {
    headline = metric;
    metric = null;
  }

  const support = slide.blocks.filter(
    (b): b is TextBlock =>
      b.kind !== 'bullets' && b !== label && b !== highlight && b !== headline && b !== metric,
  );

  return {
    archetype: pickArchetype(slide, items.length, metric),
    label,
    headline,
    metric,
    support,
    items,
    highlight,
  };
}
