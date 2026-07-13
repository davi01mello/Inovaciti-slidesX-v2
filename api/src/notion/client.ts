/**
 * Integração com o Notion (token único da CITi -- ver config.ts): leitura pra importar
 * o briefing direto de uma página, e escrita pra devolver o link da apresentação gerada
 * na mesma página de origem.
 *
 * A API do Notion só enxerga páginas que foram explicitamente compartilhadas com a
 * integração (feito manualmente no Notion, uma vez por página) -- por isso a lista
 * de páginas pode vir vazia mesmo com o token certo, se ninguém compartilhou nada.
 * Escrever de volta exige que a integração tenha as capacidades "Update content" e
 * "Insert content" habilitadas em notion.so/my-integrations (só "Read content" não
 * basta) -- sem isso, updatePageAfterGeneration falha com um NotionError 'upstream'.
 */
import { config } from '../config.js';
import { logger } from '../logger.js';

const API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export class NotionError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'NotionError';
  }
}

function requireApiKey(): void {
  if (!config.notionApiKey) {
    throw new NotionError('Integração com o Notion não configurada no servidor (falta NOTION_API_KEY em api/.env).', 'not_configured');
  }
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${config.notionApiKey}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

export interface NotionPageSummary {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
}

interface NotionRichText {
  plain_text?: string;
}

interface NotionTitleProperty {
  type: 'title';
  title: NotionRichText[];
}

interface NotionPageObject {
  id: string;
  url: string;
  last_edited_time: string;
  properties: Record<string, { type: string; title?: NotionRichText[] } | NotionTitleProperty>;
}

interface NotionSearchResponse {
  results?: NotionPageObject[];
}

function extractTitle(page: NotionPageObject): string {
  for (const prop of Object.values(page.properties ?? {})) {
    if (prop.type === 'title' && Array.isArray(prop.title)) {
      const text = prop.title.map((t) => t.plain_text ?? '').join('');
      if (text.trim().length > 0) return text.trim();
    }
  }
  return 'Sem título';
}

/** Lista páginas compartilhadas com a integração, mais recém-editadas primeiro. */
export async function listPages(): Promise<NotionPageSummary[]> {
  requireApiKey();

  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      filter: { property: 'object', value: 'page' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 30,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    logger.error({ status: res.status, detail }, 'falha ao listar páginas do Notion');
    throw new NotionError(`Falha ao listar páginas do Notion (${res.status}).`, 'upstream');
  }

  const data = (await res.json()) as NotionSearchResponse;
  return (data.results ?? []).map((page) => ({
    id: page.id,
    title: extractTitle(page),
    url: page.url,
    lastEditedTime: page.last_edited_time,
  }));
}

interface NotionBlockObject {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
}

interface NotionBlockChildrenResponse {
  results?: NotionBlockObject[];
  has_more?: boolean;
  next_cursor?: string | null;
}

// Tetos generosos mas finitos: uma página de Notion pode ter milhares de blocos
// aninhados (banco de dados inteiro embutido, por exemplo) -- sem isso, uma
// página gigante trava a importação por minutos.
const MAX_BLOCKS = 400;
const MAX_DEPTH = 4;
const MAX_TEXT_CHARS = 9500;

function textFromRichText(richText: unknown): string {
  if (!Array.isArray(richText)) return '';
  return richText.map((run: NotionRichText) => run.plain_text ?? '').join('');
}

/** Extrai o texto legível de um bloco, no formato apropriado ao tipo. */
function textFromBlock(block: NotionBlockObject): string {
  const body = block[block.type] as { rich_text?: unknown; checked?: boolean } | undefined;
  const text = textFromRichText(body?.rich_text);
  if (!text) return '';

  switch (block.type) {
    case 'heading_1':
      return `\n# ${text}`;
    case 'heading_2':
      return `\n## ${text}`;
    case 'heading_3':
      return `\n### ${text}`;
    case 'bulleted_list_item':
    case 'numbered_list_item':
      return `- ${text}`;
    case 'to_do':
      return `${body?.checked ? '[x]' : '[ ]'} ${text}`;
    case 'quote':
      return `> ${text}`;
    default:
      return text;
  }
}

async function fetchChildren(blockId: string): Promise<NotionBlockObject[]> {
  const blocks: NotionBlockObject[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL(`${API_BASE}/blocks/${blockId}/children`);
    url.searchParams.set('page_size', '100');
    if (cursor) url.searchParams.set('start_cursor', cursor);

    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error({ status: res.status, detail, blockId }, 'falha ao ler blocos do Notion');
      throw new NotionError(`Falha ao ler o conteúdo da página no Notion (${res.status}).`, 'upstream');
    }
    const data = (await res.json()) as NotionBlockChildrenResponse;
    blocks.push(...(data.results ?? []));
    cursor = data.has_more ? (data.next_cursor ?? undefined) : undefined;
  } while (cursor && blocks.length < MAX_BLOCKS);

  return blocks;
}

/** Percorre a página (recursivo, com teto de profundidade e quantidade) e devolve texto puro. */
async function walkBlocks(blockId: string, depth: number, budget: { count: number }): Promise<string[]> {
  if (depth > MAX_DEPTH || budget.count >= MAX_BLOCKS) return [];

  const children = await fetchChildren(blockId);
  const lines: string[] = [];

  for (const block of children) {
    if (budget.count >= MAX_BLOCKS) break;
    budget.count += 1;

    const line = textFromBlock(block);
    if (line) lines.push(line);

    if (block.has_children && block.type !== 'child_page' && block.type !== 'child_database') {
      const nested = await walkBlocks(block.id, depth + 1, budget);
      lines.push(...nested);
    }
  }

  return lines;
}

/** Extrai o texto legível de uma página inteira, pronto pra virar o campo "ideia" do wizard. */
export async function getPageContent(pageId: string): Promise<string> {
  requireApiKey();

  const budget = { count: 0 };
  const lines = await walkBlocks(pageId, 0, budget);
  const text = lines.join('\n').trim();

  if (!text) {
    throw new NotionError('Essa página do Notion está vazia (ou só tem conteúdo que não consigo ler, como tabelas ou embeds).', 'empty');
  }

  if (text.length > MAX_TEXT_CHARS) {
    return text.slice(0, MAX_TEXT_CHARS) + '\n[...texto truncado]';
  }
  return text;
}

// Nomes de propriedade sugeridos em notion-briefings-setup.md -- times podem ter
// nomeado diferente, então a escrita é best-effort: só mexe no que reconhece.
const URL_PROPERTY_NAMES = ['Link do CITi Slides', 'Link do Citi Slides', 'Link'];
const STATUS_PROPERTY_NAMES = ['Status'];
const STATUS_DONE_OPTION = 'Pronto';

interface NotionPageWithProps {
  properties: Record<string, { type: string; select?: { options?: Array<{ name: string }> } }>;
}

async function fetchPageProperties(pageId: string): Promise<NotionPageWithProps> {
  const res = await fetch(`${API_BASE}/pages/${pageId}`, { headers: headers() });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    logger.error({ status: res.status, detail, pageId }, 'falha ao ler propriedades da página do Notion');
    throw new NotionError(`Falha ao ler a página no Notion (${res.status}).`, 'upstream');
  }
  return (await res.json()) as NotionPageWithProps;
}

/**
 * Escreve de volta na página de origem depois que uma apresentação é gerada: preenche
 * a propriedade de link (se existir e for do tipo URL) e marca Status como "Pronto"
 * (se existir e for do tipo select com essa opção). Também insere um bloco de callout
 * no topo com o link, sempre. Cada passo é best-effort e não derruba os outros --
 * páginas sem essas propriedades ainda ganham o callout.
 *
 * Requer que a integração tenha "Update content" e "Insert content" habilitadas
 * (só "Read content" não é suficiente); sem isso as chamadas voltam com erro 'upstream'.
 */
export async function updatePageAfterGeneration(
  pageId: string,
  presentationUrl: string,
): Promise<{ propertyUpdated: boolean; blockInserted: boolean }> {
  requireApiKey();

  let propertyUpdated = false;
  try {
    const page = await fetchPageProperties(pageId);
    const properties: Record<string, unknown> = {};

    const urlPropName = Object.keys(page.properties).find(
      (name) => URL_PROPERTY_NAMES.includes(name) && page.properties[name]?.type === 'url',
    );
    if (urlPropName) properties[urlPropName] = { url: presentationUrl };

    const statusPropName = Object.keys(page.properties).find(
      (name) => STATUS_PROPERTY_NAMES.includes(name) && page.properties[name]?.type === 'select',
    );
    if (statusPropName) {
      const options = page.properties[statusPropName]?.select?.options ?? [];
      const hasDoneOption = options.some((option) => option.name === STATUS_DONE_OPTION);
      if (hasDoneOption) properties[statusPropName] = { select: { name: STATUS_DONE_OPTION } };
    }

    if (Object.keys(properties).length > 0) {
      const res = await fetch(`${API_BASE}/pages/${pageId}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ properties }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        logger.error({ status: res.status, detail, pageId }, 'falha ao atualizar propriedades da página do Notion');
      } else {
        propertyUpdated = true;
      }
    }
  } catch (err) {
    logger.error({ err, pageId }, 'falha ao tentar atualizar propriedades da página do Notion');
  }

  let blockInserted = false;
  try {
    const res = await fetch(`${API_BASE}/blocks/${pageId}/children`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({
        children: [
          {
            object: 'block',
            type: 'callout',
            callout: {
              icon: { type: 'emoji', emoji: '🔗' },
              rich_text: [
                { type: 'text', text: { content: 'Apresentação gerada no CITi Slides — ' } },
                { type: 'text', text: { content: presentationUrl, link: { url: presentationUrl } } },
              ],
            },
          },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error({ status: res.status, detail, pageId }, 'falha ao inserir bloco na página do Notion');
    } else {
      blockInserted = true;
    }
  } catch (err) {
    logger.error({ err, pageId }, 'falha ao tentar inserir bloco na página do Notion');
  }

  if (!propertyUpdated && !blockInserted) {
    throw new NotionError(
      'Não consegui escrever de volta nessa página do Notion. Confira se a integração tem as permissões "Update content" e "Insert content" habilitadas.',
      'upstream',
    );
  }

  return { propertyUpdated, blockInserted };
}
