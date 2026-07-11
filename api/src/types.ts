/**
 * SYNC_WITH: app/src/types/generated.ts, app/src/types/slide.ts, app/src/types/creation.ts,
 * app/src/lib/richText.tsx. Não há pacote compartilhado entre api/ e app/ (decisão consciente),
 * então estes tipos são espelhados na mão e o script scripts/check-contract.mjs falha o
 * predev/prebuild dos dois lados se alguma declaração do contrato divergir.
 */

export type PresentationSize = 'focused' | 'balanced' | 'complete';
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

export interface RichRun {
  text: string;
  bold?: boolean;
  highlight?: boolean;
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
  size: PresentationSize;
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
  size: PresentationSize;
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
  size: PresentationSize;
  style: VisualStyle;
  slide: GeneratedSlide;
  otherSlides: GeneratedSlide[];
}
export interface ImproveResponseBody {
  blocks: GeneratedBlock[];
}
