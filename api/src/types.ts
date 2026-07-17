/**
 * SYNC_WITH: app/src/types/generated.ts, app/src/types/slide.ts, app/src/types/creation.ts,
 * app/src/lib/richText.tsx. Não há pacote compartilhado entre api/ e app/ (decisão consciente),
 * então estes tipos são espelhados na mão e o script scripts/check-contract.mjs falha o
 * predev/prebuild dos dois lados se alguma declaração do contrato divergir.
 */

export type PresentationGoal = 'convince' | 'inform' | 'inspire' | 'train';
export type VisualStyle = 'minimal' | 'balanced' | 'bold';
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

export type TextColorKey = 'default' | 'white' | 'gray' | 'green';
export type FontFamilyKey = 'sora' | 'inter' | 'poppins' | 'space-grotesk' | 'manrope' | 'outfit';
export type FontSizeKey = 'sm' | 'md' | 'lg' | 'xl';

export interface RichRun {
  text: string;
  bold?: boolean;
  highlight?: boolean;
  color?: TextColorKey;
  fontFamily?: FontFamilyKey;
  size?: FontSizeKey;
}
export type RichText = RichRun[];

/**
 * CARD ≠ TÓPICO. A regra de forma mais importante do produto vive no TIPO.
 *   CARD    conteúdo COM CORPO: title (2-5 palavras) + body (2-3 frases).  Máx 3.
 *   TÓPICO  uma LINHA: 6-14 palavras, lista leve numerada, sem caixa.      Máx 5.
 * Os dois NUNCA no mesmo slide. Ver o comentário longo em app/src/types/slide.ts.
 * SYNC_WITH: app/src/types/slide.ts
 */
export const MAX_CARDS = 3;
export const MAX_TOPICS = 5;
export const MAX_STATS = 4;
export const MAX_STEPS = 5;
export const MAX_COMPARE_POINTS = 3;

/**
 * OS ÍCONES DE SLIDE: o vocabulário fechado que a IA pode pedir por item (card,
 * métrica, lado de comparação). O desenho vive no front
 * (app/src/components/present/slideIcons.tsx); aqui só existe o NOME, validado
 * em normalize.ts — nome fora da lista simplesmente cai.
 * SYNC_WITH: app/src/types/slide.ts
 */
export const SLIDE_ICONS = ['busca', 'grafico', 'usuarios', 'documento', 'calendario', 'lista', 'cadeado', 'cubo', 'alvo', 'raio', 'escudo', 'relogio', 'engrenagem', 'dados', 'foguete', 'check', 'aspas', 'cifrao', 'lampada', 'estrela', 'trofeu', 'coracao', 'mapa', 'bandeira', 'chat', 'monitor', 'nuvem', 'chip', 'predio', 'play', 'camadas', 'globo'] as const;
export type SlideIconName = (typeof SLIDE_ICONS)[number];

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
  /** Ícones paralelos às etapas (mesmo índice). Todos ou nenhum. */
  icons?: SlideIconName[];
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

export interface DraftAssetMeta {
  name: string;
  kind: 'image' | 'pdf' | 'logo' | 'other';
}

export interface GenerateRequestBody {
  idea: string;
  /** Quantidade exata de slides escolhida no wizard (1 a 50). */
  slideCount: number;
  /** O que a apresentação precisa alcançar: guia a narrativa do estrategista. */
  goal: PresentationGoal;
  /** Público descrito pelo usuário em texto livre (opcional, pode vir vazio). */
  audience?: string;
  style: VisualStyle;
  assets?: DraftAssetMeta[];
}
export interface GenerateResponseBody {
  title: string;
  slides: GeneratedSlide[];
  chat: string[];
}

export interface ChatHistoryMessage {
  author: 'ai' | 'user';
  text: string;
}
/** Imagem anexada pelo usuário no chat, mandada inline pro modelo (multimodal). */
export interface ChatAttachmentPayload {
  name: string;
  mimeType: string;
  dataBase64: string;
}
export interface ChatRequestBody {
  idea: string;
  goal: PresentationGoal;
  style: VisualStyle;
  slides: GeneratedSlide[];
  history: ChatHistoryMessage[];
  message: string;
  attachments?: ChatAttachmentPayload[];
}
export interface ChatResponseBody {
  reply: string;
}

export interface ImproveRequestBody {
  idea: string;
  goal: PresentationGoal;
  style: VisualStyle;
  slide: GeneratedSlide;
  otherSlides: GeneratedSlide[];
}
export interface ImproveResponseBody {
  blocks: GeneratedBlock[];
}
