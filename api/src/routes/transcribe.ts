/**
 * Ditado por voz: recebe o áudio gravado no navegador (base64, JSON -- mesmo estilo
 * das outras rotas, sem multipart) e devolve o texto transcrito (OpenAI Whisper).
 * Protegida por login (requireAuth, aplicado em index.ts) e por rate limit dedicado
 * (transcribeLimits) -- é uma chamada paga à OpenAI, embora bem mais barata que
 * gerar imagem.
 */
import { Router } from 'express';
import { transcribeAudio, TranscribeError } from '../openai/client.js';
import { transcribeBodySchema, parseBody } from '../validation.js';
import { logger } from '../logger.js';

export const transcribeRouter = Router();

transcribeRouter.post('/', (req, res) => {
  void handleTranscribe(req, res);
});

async function handleTranscribe(req: import('express').Request, res: import('express').Response): Promise<void> {
  const body = parseBody(transcribeBodySchema, req, res);
  if (!body) return;

  try {
    const text = await transcribeAudio(body.audioBase64, body.mimeType);
    res.json({ text });
  } catch (err) {
    if (err instanceof TranscribeError && err.code === 'not_configured') {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err instanceof TranscribeError && err.code === 'empty') {
      res.status(422).json({ error: err.message });
      return;
    }
    logger.error({ err, request_id: req.requestId }, 'falha ao transcrever áudio');
    res.status(502).json({ error: err instanceof TranscribeError ? err.message : 'Não consegui transcrever o áudio agora. Tenta de novo.' });
  }
}
