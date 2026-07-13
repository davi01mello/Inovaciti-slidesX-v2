/**
 * Cliente da integração com o Notion (ver api/src/routes/notion.ts): lista páginas
 * compartilhadas com a integração, extrai o texto de uma delas pro campo de ideia do
 * wizard, e escreve de volta o link da apresentação gerada na página de origem.
 */
import { AiClientError } from './aiClient';

export interface NotionPageSummary {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
}

interface ListPagesResponse {
  pages: NotionPageSummary[];
}

interface PageContentResponse {
  text: string;
}

export interface NotionWriteBackResult {
  propertyUpdated: boolean;
  blockInserted: boolean;
}

async function handleErrorResponse(res: Response): Promise<never> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (res.status === 503) {
    throw new AiClientError(data?.error ?? 'Integração com o Notion não configurada nesse servidor.', 'unavailable');
  }
  if (res.status === 429) {
    throw new AiClientError('Muitas requisições ao Notion. Tenta de novo daqui a pouco.', 'rate_limit');
  }
  throw new AiClientError(data?.error ?? 'Não consegui falar com o Notion agora. Tenta de novo.', 'server');
}

export async function listNotionPages(): Promise<NotionPageSummary[]> {
  const res = await fetch('/api/notion/pages');
  if (!res.ok) await handleErrorResponse(res);
  const data = (await res.json()) as ListPagesResponse;
  return data.pages;
}

export async function getNotionPageContent(pageId: string): Promise<string> {
  const res = await fetch(`/api/notion/pages/${pageId}/content`);
  if (!res.ok) await handleErrorResponse(res);
  const data = (await res.json()) as PageContentResponse;
  return data.text;
}

/** Escreve o link da apresentação de volta na página do Notion de origem. */
export async function writeBackToNotion(pageId: string, url: string): Promise<NotionWriteBackResult> {
  const res = await fetch(`/api/notion/pages/${pageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) await handleErrorResponse(res);
  return (await res.json()) as NotionWriteBackResult;
}
