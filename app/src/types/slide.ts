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
 * Elemento visual 3D da marca (blob/ícone) solto sobre o slide — não é texto,
 * não entra no template-composition; é uma camada de imagem posicionada livremente.
 * `assetKey` é a chave do manifesto em services/elementsManifest.ts (ex: "azul/coracao").
 */
export interface Decoration {
  id: string;
  assetKey: string;
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

export const BLOCK_KIND_META: Record<Block['kind'], { label: string; hint: string }> = {
  'title-1': { label: 'Título 1', hint: 'Grande. Para chamar atenção.' },
  'title-2': { label: 'Título 2', hint: 'Médio. Bom para começar um slide.' },
  'title-3': { label: 'Título 3', hint: 'Menor. Para subseções.' },
  subtitle: { label: 'Subtítulo', hint: 'Complementa um título.' },
  body: { label: 'Texto', hint: 'Parágrafo livre.' },
  bullets: { label: 'Tópicos', hint: 'Lista com marcadores.' },
  highlight: { label: 'Destaque', hint: 'Frase com barra lateral verde.' },
  'section-label': { label: 'Rótulo', hint: 'Etiqueta pequena em maiúsculas.' },
};

export const BLOCK_KIND_ORDER: Block['kind'][] = [
  'title-1',
  'title-2',
  'title-3',
  'subtitle',
  'body',
  'bullets',
  'highlight',
  'section-label',
];
