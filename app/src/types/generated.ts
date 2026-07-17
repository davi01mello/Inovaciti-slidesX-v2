import type { BlockAlign, SlideIconName, SlideLayout, TextBlockKind } from '@/types/slide';
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
  icon?: SlideIconName;
}

export interface GeneratedCardsBlock {
  kind: 'cards';
  items: GeneratedCard[];
}

export interface GeneratedTopicsBlock {
  kind: 'topics';
  items: RichText[];
}

/** Uma métrica: valor curto com dígito ("R$ 48 mil", "3x") + rótulo de 1 a 6 palavras. */
export interface GeneratedStatItem {
  value: RichText;
  label: RichText;
  icon?: SlideIconName;
}

/** 1 item = número gigante (bignumber). 2 a 4 = painel de indicadores (kpis). */
export interface GeneratedStatsBlock {
  kind: 'stats';
  items: GeneratedStatItem[];
}

/** Etapas em sequência (timeline numerada). 3 a 5 itens de uma linha. */
export interface GeneratedStepsBlock {
  kind: 'steps';
  items: RichText[];
}

export interface GeneratedCompareSide {
  label: RichText;
  points: RichText[];
  icon?: SlideIconName;
}

/** Dois lados frente a frente (antes/depois, com/sem). Sempre exatamente 2 lados. */
export interface GeneratedCompareBlock {
  kind: 'compare';
  sides: GeneratedCompareSide[];
}

export type GeneratedBlock =
  | GeneratedTextBlock
  | GeneratedCardsBlock
  | GeneratedTopicsBlock
  | GeneratedStatsBlock
  | GeneratedStepsBlock
  | GeneratedCompareBlock;

export interface GeneratedSlide {
  layout: SlideLayout;
  blocks: GeneratedBlock[];
}
