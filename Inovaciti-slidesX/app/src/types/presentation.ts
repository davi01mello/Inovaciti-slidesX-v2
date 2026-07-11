import type { ChatMessage } from '@/types/chat';
import type { PresentationSize, VisualStyle, DraftAsset } from '@/types/creation';
import type { Slide } from '@/types/slide';

export type PresentationStatus = 'draft' | 'generating' | 'ready';

export interface Presentation {
  id: string;
  title: string;
  status: PresentationStatus;
  createdAt: number;
  updatedAt: number;
  /** Presente = está na Lixeira desde esse timestamp. Some das listagens normais e é
   * apagada de vez (purge) automaticamente após o período de retenção. */
  deletedAt?: number;
  meta: {
    idea: string;
    size: PresentationSize;
    style: VisualStyle;
    assets: DraftAsset[];
  };
  slides: Slide[];
  chat: ChatMessage[];
  /** Preenchido quando a geração inicial (via IA) falha — UI mostra e oferece "tentar de novo". */
  generationError?: string;
}
