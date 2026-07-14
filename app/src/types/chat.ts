export type ChatAuthor = 'ai' | 'user';

/** Miniatura persistida de uma imagem anexada — só o suficiente pra reexibir a bolha. */
export interface ChatMessageAttachment {
  name: string;
  /** Data URL pequena (~20KB); a imagem cheia só viaja na request, não fica no histórico. */
  thumb: string;
}

export interface ChatMessage {
  id: string;
  author: ChatAuthor;
  text: string;
  createdAt: number;
  attachments?: ChatMessageAttachment[];
}
