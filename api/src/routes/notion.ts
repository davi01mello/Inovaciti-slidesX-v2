/**
 * Integração com o Notion pro wizard de criação (ver notion/client.ts): leitura pra
 * importar o briefing direto de uma página, e escrita pra devolver o link da
 * apresentação gerada na mesma página. Rotas protegidas por login (requireAuth) e
 * rate limit leve em index.ts.
 */
import { Router } from 'express';
import { getPageContent, listPages, NotionError, updatePageAfterGeneration } from '../notion/client.js';
import { logger } from '../logger.js';
import { notionWriteBackBodySchema, parseBody } from '../validation.js';

export const notionRouter = Router();

// IDs de página do Notion são UUIDs, com ou sem hífen (a API aceita os dois formatos).
const NOTION_PAGE_ID = /^[0-9a-fA-F-]{32,36}$/;

notionRouter.get('/pages', (req, res) => {
  void handleListPages(req, res);
});

notionRouter.get('/pages/:id/content', (req, res) => {
  void handleGetContent(req, res);
});

notionRouter.patch('/pages/:id', (req, res) => {
  void handleWriteBack(req, res);
});

async function handleListPages(req: import('express').Request, res: import('express').Response): Promise<void> {
  try {
    const pages = await listPages();
    res.json({ pages });
  } catch (err) {
    handleNotionError(err, req, res);
  }
}

async function handleGetContent(req: import('express').Request, res: import('express').Response): Promise<void> {
  const id = req.params.id ?? '';
  if (!NOTION_PAGE_ID.test(id)) {
    res.status(400).json({ error: 'ID de página do Notion inválido.' });
    return;
  }

  try {
    const text = await getPageContent(id);
    res.json({ text });
  } catch (err) {
    handleNotionError(err, req, res);
  }
}

async function handleWriteBack(req: import('express').Request, res: import('express').Response): Promise<void> {
  const id = req.params.id ?? '';
  if (!NOTION_PAGE_ID.test(id)) {
    res.status(400).json({ error: 'ID de página do Notion inválido.' });
    return;
  }

  const body = parseBody(notionWriteBackBodySchema, req, res);
  if (!body) return;

  try {
    const result = await updatePageAfterGeneration(id, body.url);
    res.json(result);
  } catch (err) {
    handleNotionError(err, req, res);
  }
}

function handleNotionError(err: unknown, req: import('express').Request, res: import('express').Response): void {
  if (err instanceof NotionError && err.code === 'not_configured') {
    res.status(503).json({ error: err.message });
    return;
  }
  if (err instanceof NotionError && err.code === 'empty') {
    res.status(422).json({ error: err.message });
    return;
  }
  logger.error({ err, request_id: req.requestId }, 'falha na integração com o Notion');
  res.status(502).json({ error: err instanceof NotionError ? err.message : 'Não consegui falar com o Notion agora. Tenta de novo.' });
}
