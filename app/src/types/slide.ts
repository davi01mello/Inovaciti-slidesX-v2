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
export const MAX_STATS = 4;
export const MAX_STEPS = 5;
export const MAX_COMPARE_POINTS = 3;

/**
 * OS ÍCONES DE SLIDE: o vocabulário fechado que a IA pode pedir por item (card,
 * métrica, lado de comparação). O desenho vive em
 * components/present/slideIcons.tsx; o servidor valida o nome em normalize.ts.
 * SYNC_WITH: api/src/types.ts (verificado por scripts/check-contract.mjs).
 */
export const SLIDE_ICONS = ['busca', 'grafico', 'usuarios', 'documento', 'calendario', 'lista', 'cadeado', 'cubo', 'alvo', 'raio', 'escudo', 'relogio', 'engrenagem', 'dados', 'foguete', 'check', 'aspas', 'cifrao', 'lampada', 'estrela', 'trofeu', 'coracao', 'mapa', 'bandeira', 'chat', 'monitor', 'nuvem', 'chip', 'predio', 'play', 'camadas', 'globo'] as const;
export type SlideIconName = (typeof SLIDE_ICONS)[number];

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
  icon?: SlideIconName;
  /** Sobrescreve o ordinal automático ("01"). Vazio/ausente = automático. */
  marker?: RichText;
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
  /** Sobrescreve o ordinal automático ("01") do item de mesmo índice. Vazio = automático. */
  markers?: RichText[];
}

/** Uma métrica: valor curto com dígito ("R$ 48 mil", "3x") + rótulo de 1 a 6 palavras. */
export interface StatItem {
  id: string;
  value: RichText;
  label: RichText;
  icon?: SlideIconName;
}

/** 1 item = número gigante (bignumber). 2 a 4 = painel de indicadores (kpis). */
export interface StatsBlock {
  id: string;
  kind: 'stats';
  align: BlockAlign;
  /** No máximo MAX_STATS. */
  items: StatItem[];
}

/** Etapas em sequência (timeline numerada). Cada item é UMA linha. */
export interface StepsBlock {
  id: string;
  kind: 'steps';
  align: BlockAlign;
  /** No máximo MAX_STEPS. */
  items: RichText[];
  /** Sobrescreve o ordinal automático ("01") do item de mesmo índice. Vazio = automático. */
  markers?: RichText[];
}

export interface CompareSide {
  id: string;
  label: RichText;
  /** No máximo MAX_COMPARE_POINTS por lado. O primeiro é a afirmação; os demais sustentam. */
  points: RichText[];
  icon?: SlideIconName;
}

/** Dois lados frente a frente (antes/depois, com/sem). Sempre exatamente 2 lados. */
export interface CompareBlock {
  id: string;
  kind: 'compare';
  align: BlockAlign;
  sides: CompareSide[];
}

export type Block = TextBlock | CardsBlock | TopicsBlock | StatsBlock | StepsBlock | CompareBlock;

const LIST_KINDS = new Set(['cards', 'topics', 'stats', 'steps', 'compare']);

/** Bloco estruturado (tudo que carrega itens em vez de um texto só). */
export function isListBlock(
  block: Block,
): block is CardsBlock | TopicsBlock | StatsBlock | StepsBlock | CompareBlock {
  return LIST_KINDS.has(block.kind);
}

/** Texto simples (tudo que não é bloco estruturado). */
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
 * `Slide.image`, que é a foto de CONTEÚDO do arquétipo media. Três origens:
 * - elemento (blob) da marca: `assetKey` aponta pro elementsManifest (ex: "azul/coracao");
 * - ícone (pictograma) da marca: `assetKey` aponta pro iconsManifest (ex: "valores/jogo-limpo");
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

/**
 * Sobrescreve a MARCA CITi do canto deste slide: o usuário pode movê-la,
 * redimensioná-la ou apagá-la. Ausente = o motor decide o canto (o padrão).
 */
export interface SlideBrandMark {
  hidden?: boolean;
  rect?: BlockRect;
}

/**
 * As ZONAS de um slide composto: o grupo de título, o conteúdo principal, a
 * coluna auxiliar (lista do split / foto do media) e a faixa de fecho. TODAS
 * são móveis e redimensionáveis no editor — o motor decide, o humano pode
 * discordar de cada uma, independentemente.
 */
export type ZoneKey = 'header' | 'content' | 'aside' | 'banner';

export interface Slide {
  id: string;
  layout: SlideLayout;
  blocks: Block[];
  /** A foto do usuário. Presente = este slide é `media`. */
  image?: SlideImage;
  decorations?: Decoration[];
  /**
   * LEGADO: o override antigo, só da zona de conteúdo. Lido como fallback de
   * zoneOverrides.content pra decks salvos antes das zonas todas serem móveis.
   */
  contentZoneOverride?: BlockRect;
  /**
   * Sobrescreve a posição/tamanho de QUALQUER zona do slide (título, conteúdo,
   * coluna auxiliar, faixa). Ausente = quem manda é o motor de zonas.
   */
  zoneOverrides?: Partial<Record<ZoneKey, BlockRect>>;
  /** Sobrescreve a marca CITi do canto (mover/redimensionar/apagar). */
  brandMark?: SlideBrandMark;
}
