import type { ChatMessage } from '@/types/chat';
import type { PresentationGoal, VisualStyle, DraftAsset } from '@/types/creation';
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
  /**
   * O EIXO DE COR do deck: 0 = Gelo, 0.5 = Azul, 1 = Verde.
   *
   * Um número só, e ele faz DUAS coisas: escolhe as artes (deckArt.ts monta o deck
   * com artes vizinhas no eixo) e pinta o cromo (tone.ts). Arrastar a barra no
   * workspace repinta o deck inteiro sem tocar numa letra do texto.
   */
  tone: number;
  meta: {
    idea: string;
    /** Quantidade de slides pedida na criação. */
    slideCount: number;
    goal: PresentationGoal;
    /** Público descrito no wizard. Vazio significa que a IA deduziu pela ideia. */
    audience: string;
    style: VisualStyle;
    /** Só a FICHA dos anexos. Os pixels vivem no slide (ver DraftAsset). */
    assets: DraftAsset[];
  };
  slides: Slide[];
  chat: ChatMessage[];
  /** Preenchido quando a geração inicial (via IA) falha — UI mostra e oferece "tentar de novo". */
  generationError?: string;
  /** ID da página do Notion de onde essa apresentação veio (via "Importar do Notion" no wizard). */
  notionPageId?: string;
  /** Timestamp da última vez que o link foi escrito de volta na página do Notion. */
  notionSyncedAt?: number;
}
