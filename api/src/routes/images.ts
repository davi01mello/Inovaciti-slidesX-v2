/**
 * Geração de imagem sob demanda pro editor de slides (ver openai/client.ts). Rota
 * protegida por login (requireAuth) e por rate limit dedicado (imageGenLimits em
 * index.ts) -- é a ação mais cara do app, então o teto é baixo de propósito.
 */
import { Router } from 'express';
import { generateImage, ImageGenError } from '../openai/client.js';
import { generateImageBodySchema, parseBody } from '../validation.js';
import { logger } from '../logger.js';

export const imagesRouter = Router();

imagesRouter.post('/generate', (req, res) => {
  void handleGenerate(req, res);
});

async function handleGenerate(req: import('express').Request, res: import('express').Response): Promise<void> {
  const body = parseBody(generateImageBodySchema, req, res);
  if (!body) return;

  try {
    const image = await generateImage(body.prompt);
    res.json({
      dataUrl: `data:${image.mimeType};base64,${image.base64}`,
      width: image.width,
      height: image.height,
    });
  } catch (err) {
    if (err instanceof ImageGenError && err.code === 'not_configured') {
      res.status(503).json({ error: err.message });
      return;
    }
    logger.error({ err, request_id: req.requestId }, 'falha ao gerar imagem com IA');
    res.status(502).json({ error: err instanceof ImageGenError ? err.message : 'Não consegui gerar a imagem agora. Tenta de novo.' });
  }
}
