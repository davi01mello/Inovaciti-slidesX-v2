export type ChatAuthor = 'ai' | 'user';

export interface ChatMessage {
  id: string;
  author: ChatAuthor;
  text: string;
  createdAt: number;
}
