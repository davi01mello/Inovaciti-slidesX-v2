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
