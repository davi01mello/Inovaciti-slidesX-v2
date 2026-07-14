import type { BlockAlign, SlideLayout, TextBlockKind } from '@/types/slide';
import type { RichText } from '@/lib/richText';

/**
 * SYNC_WITH: api/src/types.ts (verificado por scripts/check-contract.mjs no predev/prebuild).
 * Formato "cru" que a API manda: só CONTEÚDO, sem id e sem posição. O front vira Slide/Block
 * reais em lib/generatedSlide.ts, e quem POSICIONA é o motor de zonas medindo a arte
 * (services/artZones.ts). A IA escreve; ela nunca decide layout.
 */
export interface GeneratedTextBlock {
  kind: TextBlockKind;
  align?: BlockAlign;
  content: RichText;
}

export interface GeneratedCard {
  title: RichText;
  body: RichText;
}

export interface GeneratedCardsBlock {
  kind: 'cards';
  items: GeneratedCard[];
}

export interface GeneratedTopicsBlock {
  kind: 'topics';
  items: RichText[];
}

export type GeneratedBlock = GeneratedTextBlock | GeneratedCardsBlock | GeneratedTopicsBlock;

export interface GeneratedSlide {
  layout: SlideLayout;
  blocks: GeneratedBlock[];
}
