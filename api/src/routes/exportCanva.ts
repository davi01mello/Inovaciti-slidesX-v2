/**
 * Exporta a apresentação pro Canva: o FRONT monta o .pptx (slides compostos no
 * template e rasterizados no navegador) e manda o arquivo pronto; aqui a gente só
 * repassa pro "Design Import" da Canva, que devolve um design editável de verdade
 * (não é só upload de imagem). Como o import é assíncrono, a rota tenta esperar
 * terminar (job costuma ser rápido pra poucos slides); se demorar mais que
 * WAIT_INLINE_MS, devolve 202 com o jobId e o front cai pro polling via /status.
 */
import { setTimeout as sleep } from 'node:timers/promises';
import express, { Router } from 'express';
import { CanvaError, createDesignImportJob, getDesignImportJob } from '../canva/client.js';
import { logger } from '../logger.js';
import { SAFE_ID } from '../validation.js';

export const exportCanvaRouter = Router();

const WAIT_INLINE_MS = 20_000;
const POLL_INTERVAL_MS = 1_500;
const TITLE_MAX_LENGTH = 200;

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
// 1920x1080 por slide, até 50 slides: os pptx reais ficam bem abaixo disso.
const MAX_PPTX_SIZE = '120mb';

function canvaErrorStatus(err: unknown): number {
  if (err instanceof CanvaError) return err.code === 'not_connected' ? 409 : 502;
  return 502;
}

const pptxBody = express.raw({ type: [PPTX_MIME, 'application/octet-stream'], limit: MAX_PPTX_SIZE });

exportCanvaRouter.post('/:id/export-canva', pptxBody, async (req, res) => {
  const presentationId = req.params.id;
  if (!presentationId || !SAFE_ID.test(presentationId)) {
    res.status(400).json({ error: 'Campo inválido: presentationId.' });
    return;
  }

  const fileBuffer = req.body as unknown;
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    res.status(400).json({ error: `Mande o arquivo .pptx no corpo da requisição (Content-Type: ${PPTX_MIME}).` });
    return;
  }

  const rawTitle = typeof req.query.title === 'string' ? req.query.title : '';
  const title = rawTitle.trim().slice(0, TITLE_MAX_LENGTH) || 'Apresentação CITi';

  try {
    const jobId = await createDesignImportJob({ fileBuffer, title });
    logger.info({ presentationId, job_id: jobId }, 'export-canva: job de import criado');

    const deadline = Date.now() + WAIT_INLINE_MS;
    while (Date.now() < deadline) {
      try {
        const result = await getDesignImportJob(jobId);
        if (result.status === 'success') {
          res.json({ status: 'success', editUrl: result.editUrl, jobId });
          return;
        }
        if (result.status === 'failed') {
          res.status(502).json({ error: result.errorMessage ?? 'Falha ao importar na Canva.', status: 'failed', jobId });
          return;
        }
      } catch (err) {
        // Falha ao CONSULTAR o job (ex: 500 passageiro da Canva) não significa que
        // o job em si falhou -- ele continua rodando do lado de lá. Só propaga se
        // for algo persistente (token não conectado); o resto tenta de novo até o
        // teto de espera, em vez de cancelar a exportação por um hiccup.
        if (err instanceof CanvaError && err.code === 'not_connected') throw err;
        logger.warn({ err, jobId }, 'export-canva: falha transitória ao consultar job, tentando de novo');
      }
      await sleep(POLL_INTERVAL_MS);
    }

    // Ainda em andamento depois do teto de espera inline -- o front passa a consultar /status.
    res.status(202).json({ status: 'in_progress', jobId });
  } catch (err) {
    logger.error({ err, presentationId }, 'export-canva: falha');
    const status = canvaErrorStatus(err);
    const message = err instanceof CanvaError ? err.message : 'Falha ao exportar pra Canva. Tenta de novo em instantes.';
    res.status(status).json({ error: message });
  }
});

exportCanvaRouter.get('/:id/export-canva/:jobId/status', async (req, res) => {
  const { jobId } = req.params;
  if (!jobId) {
    res.status(400).json({ error: 'jobId é obrigatório.' });
    return;
  }
  try {
    const result = await getDesignImportJob(jobId);
    if (result.status === 'failed') {
      res.status(502).json({ error: result.errorMessage ?? 'Falha ao importar na Canva.', status: 'failed' });
      return;
    }
    res.json(result.status === 'success' ? { status: 'success', editUrl: result.editUrl } : { status: 'in_progress' });
  } catch (err) {
    // Mesma lógica do loop inline: um erro transitório ao consultar não é o job
    // tendo falhado -- devolve in_progress e deixa o front tentar de novo no
    // próximo poll, dentro do teto de 90s que ele já tem (canvaClient.ts).
    if (err instanceof CanvaError && err.code === 'not_connected') {
      res.status(409).json({ error: err.message });
      return;
    }
    logger.warn({ err, jobId }, 'export-canva/status: falha transitória ao consultar, devolvendo in_progress');
    res.json({ status: 'in_progress' });
  }
});
