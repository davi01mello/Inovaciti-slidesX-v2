/**
 * SYNC_WITH: api/src/types.ts. O contrato (PresentationGoal, VisualStyle) é
 * espelhado na mão e o scripts/check-contract.mjs falha o build se divergir.
 */

/** O que a apresentação precisa alcançar. É isso que define a narrativa. */
export type PresentationGoal = 'convince' | 'inform' | 'inspire' | 'train';

/** A voz do texto: o quanto o slide respira e o peso das frases. */
export type VisualStyle = 'minimal' | 'balanced' | 'bold';

/** Limites reais da plataforma. O wizard orienta a escolha, não empurra o teto. */
export const SLIDE_COUNT_MIN = 1;
export const SLIDE_COUNT_MAX = 50;

/** Quantidade sugerida quando o wizard abre sem nada escolhido. */
export const SLIDE_COUNT_DEFAULT = 8;

export interface DraftAsset {
  id: string;
  name: string;
  kind: 'image' | 'pdf' | 'logo' | 'other';
  sizeLabel: string;
}

export interface CreationDraft {
  idea: string;
  /** Quantidade exata de slides. Sempre definida: o passo abre com o padrão da casa. */
  slideCount: number;
  goal: PresentationGoal | null;
  /** Público em texto livre, opcional. Vazio significa "deduza da ideia". */
  audience: string;
  style: VisualStyle | null;
  assets: DraftAsset[];
}

export const EMPTY_DRAFT: CreationDraft = {
  idea: '',
  slideCount: SLIDE_COUNT_DEFAULT,
  goal: null,
  audience: '',
  style: null,
  assets: [],
};
