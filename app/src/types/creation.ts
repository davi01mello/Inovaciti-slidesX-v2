/**
 * SYNC_WITH: api/src/types.ts. O contrato (PresentationGoal, VisualStyle) é
 * espelhado na mão e o scripts/check-contract.mjs falha o build se divergir.
 */
import type { LoadedImage } from '@/lib/imageFile';

/** O que a apresentação precisa alcançar. É isso que define a narrativa. */
export type PresentationGoal = 'convince' | 'inform' | 'inspire' | 'train';

/** A VOZ do texto: o ritmo das frases. Nunca a quantidade — densidade é fixa. */
export type VisualStyle = 'minimal' | 'balanced' | 'bold';

/** Limites reais da plataforma. O wizard orienta a escolha, não empurra o teto. */
export const SLIDE_COUNT_MIN = 1;
export const SLIDE_COUNT_MAX = 50;

/** Quantidade sugerida quando o wizard abre sem nada escolhido. */
export const SLIDE_COUNT_DEFAULT = 8;

/**
 * A FICHA do arquivo. É só isto que é PERSISTIDO (em Presentation.meta.assets).
 *
 * ARMADILHA DE STORAGE, e ela é fatal: não guarde a data URL DUAS vezes (no meta
 * da apresentação E no slide). Um deck com 3 fotos estoura a cota do localStorage
 * e o app para de salvar — silenciosamente. Os PIXELS vivem no slide
 * (Slide.image); o meta guarda só a ficha.
 */
export interface DraftAsset {
  id: string;
  name: string;
  kind: 'image' | 'pdf' | 'logo' | 'other';
  sizeLabel: string;
}

/**
 * O arquivo NO RASCUNHO, com os bytes.
 *
 * O BUG QUE ISTO CONSERTA era silencioso e total: o passo de anexos guardava
 * {nome, tipo, tamanho} e JOGAVA OS BYTES FORA. A pessoa anexava a foto, via a
 * foto na lista, e a foto simplesmente não existia pro resto do sistema. Nada
 * quebrava, nada avisava: o anexo só não fazia nada.
 *
 * Isto vive em MEMÓRIA, no rascunho do wizard. Na hora de criar a apresentação,
 * os pixels vão pro slide e a ficha vai pro meta.
 */
export interface DraftAssetFile extends DraftAsset {
  /** Os pixels. Só existe em anexo de imagem. */
  image?: LoadedImage;
  /** Aviso do recorte de fundo do logo, quando houver algo a dizer. */
  notice?: string;
}

export interface CreationDraft {
  idea: string;
  /** Quantidade exata de slides. Sempre definida: o passo abre com o padrão da casa. */
  slideCount: number;
  goal: PresentationGoal | null;
  /** Público em texto livre, opcional. Vazio significa "deduza da ideia". */
  audience: string;
  style: VisualStyle | null;
  /** O EIXO DE COR: 0 = Gelo, 0.5 = Azul, 1 = Verde. Escolhe as artes E pinta o cromo. */
  tone: number;
  assets: DraftAssetFile[];
  /** Preenchido quando a ideia veio de "Importar do Notion". */
  notionPageId?: string;
}

export const EMPTY_DRAFT: CreationDraft = {
  idea: '',
  slideCount: SLIDE_COUNT_DEFAULT,
  goal: null,
  audience: '',
  style: null,
  tone: 1,
  assets: [],
};
