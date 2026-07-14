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

/**
 * CARD ≠ TÓPICO. É a regra de forma mais importante do produto, e ela vive aqui,
 * no TIPO, não numa convenção que alguém lembra de respeitar.
 *
 *              CARD                          TÓPICO
 *   o que é    conteúdo COM CORPO            uma LINHA
 *   campos     title (2-5 palavras)          texto único (6-14 palavras)
 *              + body (2-3 frases)
 *   máximo     3. NUNCA 4, NUNCA 5.          5. NUNCA 6.
 *   desenho    caixa de vidro                lista leve numerada,
 *                                            SEM caixa, sem borda, sem sombra
 *
 * Cinco caixotes empilhados fingindo ser tópicos foi exatamente o que deixou o
 * deck feio. O critério é uma pergunta só: "este item precisa de EXPLICAÇÃO pra
 * ser entendido?" Precisa → card. Não precisa → tópico. E os dois NUNCA aparecem
 * no mesmo slide.
 *
 * Os tetos valem em TRÊS camadas, porque pedir pro modelo não basta:
 *   1. o prompt pede          (api/src/intelligence/writing.ts)
 *   2. o servidor corta       (api/src/normalize.ts)
 *   3. a UI não deixa passar  (o botão "+ novo" some no teto)
 *
 * SYNC_WITH: api/src/types.ts (verificado por scripts/check-contract.mjs).
 */
export const MAX_CARDS = 3;
export const MAX_TOPICS = 5;

/** Retângulo normalizado em relação ao slide (0..1 nos dois eixos). */
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
  /**
   * Só existe em caixa de texto LIVRE (`floating`). O texto do fluxo do template
   * não tem retângulo próprio: quem o posiciona é o motor de zonas, medindo a arte
   * (services/artZones.ts). Guardar um rect pra ele seria guardar uma decisão que
   * o motor vai ignorar — era o que sobrava do sistema antigo.
   */
  rect?: BlockRect;
  /** Caixa de texto livre (estilo Canva): vive FORA do fluxo, no rect salvo. */
  floating?: boolean;
}

/** Um card: título curto e um corpo de verdade. Sem corpo não é card, é tópico. */
export interface CardItem {
  id: string;
  title: RichText;
  body: RichText;
}

export interface CardsBlock {
  id: string;
  kind: 'cards';
  align: BlockAlign;
  /** No máximo MAX_CARDS. */
  items: CardItem[];
}

export interface TopicsBlock {
  id: string;
  kind: 'topics';
  align: BlockAlign;
  /** No máximo MAX_TOPICS. Cada item é UMA linha. */
  items: RichText[];
}

export type Block = TextBlock | CardsBlock | TopicsBlock;

/** Lista (cards ou tópicos). Os dois nunca coexistem no mesmo slide. */
export function isListBlock(block: Block): block is CardsBlock | TopicsBlock {
  return block.kind === 'cards' || block.kind === 'topics';
}

/** Texto simples (tudo que não é lista). */
export function isTextBlock(block: Block): block is TextBlock {
  return !isListBlock(block);
}

/**
 * A FOTO DO USUÁRIO É CONTEÚDO, não enfeite.
 *
 * Quando um slide tem imagem, ele vira o arquétipo `media`: texto numa coluna,
 * foto emoldurada na outra. Os pixels vivem AQUI, no slide, e em nenhum outro
 * lugar — guardar a data URL também no meta do rascunho estourava a cota do
 * localStorage com três fotos.
 */
export interface SlideImage {
  /** Data URL já reduzida (ver lib/imageFile.ts). */
  src: string;
  width: number;
  height: number;
  alt?: string;
}

/**
 * Imagem solta sobre o slide (camada livre, estilo Canva). Não confundir com
 * `Slide.image`, que é a foto de CONTEÚDO do arquétipo media. Duas origens:
 * - elemento da marca: `assetKey` aponta pro manifesto (ex: "azul/coracao");
 * - upload do usuário: `assetKey` é "upload" e `src` carrega o data URL reduzido.
 */
export interface Decoration {
  id: string;
  assetKey: string;
  src?: string;
  rect: BlockRect;
  /** Rotação em graus, sentido horário. */
  rotation?: number;
}

export interface Slide {
  id: string;
  layout: SlideLayout;
  blocks: Block[];
  /** A foto do usuário. Presente = este slide é `media`. */
  image?: SlideImage;
  decorations?: Decoration[];
  /**
   * Sobrescreve a zona de conteúdo que o motor escolheu pra este slide (o usuário
   * moveu ou redimensionou a área no editor). Ausente = quem manda é o motor.
   */
  contentZoneOverride?: BlockRect;
}
