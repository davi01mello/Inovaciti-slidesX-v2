import { Router } from 'express';
import { generateJson } from '../llm/gemini.js';
import { llmErrorToHttp } from '../llm/errors.js';
import { logger } from '../logger.js';
import { normalizeImproveResponse, normalizeSlide } from '../normalize.js';
import { IMPROVE_SYSTEM_INSTRUCTION, buildImprovePrompt } from '../intelligence/index.js';
import { improveResponseSchema } from '../schema.js';
import { improveBodySchema, parseBody } from '../validation.js';
import type { GeneratedSlide } from '../types.js';

export const improveRouter = Router();

/** Slides de abertura/seção/encerramento têm conteúdo fixo por design: não faz sentido
 * gastar uma chamada de IA pra "melhorar" um slide de capa. */
const NON_IMPROVABLE_LAYOUTS = new Set(['cover', 'section', 'closing']);

improveRouter.post('/', async (req, res) => {
  const body = parseBody(improveBodySchema, req, res);
  if (!body) return;

  const slide = normalizeSlide(body.slide);
  if (!slide) {
    res.status(400).json({ error: 'Campo inválido: slide (conteúdo vazio ou malformado).' });
    return;
  }

  if (NON_IMPROVABLE_LAYOUTS.has(slide.layout)) {
    res.json({ blocks: slide.blocks });
    return;
  }

  const otherSlides = body.otherSlides.map(normalizeSlide).filter((s): s is GeneratedSlide => s !== null);

  try {
    const raw = await generateJson<unknown>({
      systemInstruction: IMPROVE_SYSTEM_INSTRUCTION,
      prompt: buildImprovePrompt({ idea: body.idea, goal: body.goal, style: body.style, slide, otherSlides }),
      responseSchema: improveResponseSchema,
    });
    const result = normalizeImproveResponse(raw, body.style);
    if (result.blocks.length === 0) {
      res.status(502).json({ error: 'O modelo não retornou um slide válido. Tenta de novo.' });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error({ request_id: req.requestId, err }, 'falha em POST /api/slides/improve');
    const mapped = llmErrorToHttp(err, 'Falha ao melhorar o slide. Tenta de novo em instantes.');
    if (mapped.retryAfter) res.setHeader('Retry-After', String(mapped.retryAfter));
    res.status(mapped.status).json(mapped.body);
  }
});
