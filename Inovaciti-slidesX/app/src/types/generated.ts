import type { BlockAlign, SlideLayout, TextBlockKind } from '@/types/slide';
import type { RichText } from '@/lib/richText';

/**
 * SYNC_WITH: api/src/types.ts (verificado por scripts/check-contract.mjs no predev/prebuild).
 * Formato "cru" que a API (citi-slides-api) manda/recebe: só conteúdo, sem id nem rect.
 * O front converte para Slide/Block reais (com id + rect calculado) em lib/generatedSlide.ts.
 */
export interface GeneratedTextBlock {
  kind: TextBlockKind;
  align?: BlockAlign;
  content: RichText;
}

export interface GeneratedBulletsBlock {
  kind: 'bullets';
  align?: BlockAlign;
  items: RichText[];
}

export type GeneratedBlock = GeneratedTextBlock | GeneratedBulletsBlock;

export interface GeneratedSlide {
  layout: SlideLayout;
  blocks: GeneratedBlock[];
}
