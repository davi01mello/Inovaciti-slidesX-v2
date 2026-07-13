import type { RichText } from '@/lib/richText';

export type SlideLayout = 'cover' | 'section' | 'content' | 'closing';
export type BlockAlign = 'left' | 'center' | 'right' | 'justify';

export type TextBlockKind =
  | 'title-1'
  | 'title-2'
  | 'title-3'
  | 'subtitle'
  | 'body'
  | 'highlight'
  | 'section-label';

/** Normalized bounding box relative to the slide (0..1 on each axis). */
export interface BlockRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextBlock {
  id: string;
  kind: TextBlockKind;
  align: BlockAlign;
  content: RichText;
  rect: BlockRect;
  /**
   * Caixa de texto livre (estilo Canva): vive FORA do fluxo do template, no
   * rect salvo — o usuário move e redimensiona à vontade. Blocos sem a flag
   * continuam fluindo nas zonas do template (composeSlide ignora flutuantes).
   */
  floating?: boolean;
}

export interface BulletsBlock {
  id: string;
  kind: 'bullets';
  align: BlockAlign;
  items: RichText[];
  rect: BlockRect;
}

export type Block = TextBlock | BulletsBlock;

/**
 * Imagem solta sobre o slide — não é texto, não entra no template-composition;
 * é uma camada posicionada livremente. Duas origens:
 * - elemento da marca: `assetKey` aponta pro manifesto (ex: "azul/coracao");
 * - upload do usuário: `assetKey` é "upload" e `src` carrega o data URL reduzido.
 */
export interface Decoration {
  id: string;
  assetKey: string;
  /** Data URL da imagem enviada pelo usuário (presente só em uploads). */
  src?: string;
  rect: BlockRect;
  /** Rotação em graus, sentido horário. */
  rotation?: number;
}

export interface Slide {
  id: string;
  layout: SlideLayout;
  blocks: Block[];
  decorations?: Decoration[];
  /**
   * Sobrescreve a área de conteúdo (título+corpo) do template pra essa slide —
   * o usuário pode mover/redimensionar a área toda no editor. Ausente = usa a
   * posição padrão calculada do template (comportamento original). Os blocos
   * dentro continuam se organizando sozinhos; só a área muda de lugar/tamanho.
   */
  contentZoneOverride?: BlockRect;
}

