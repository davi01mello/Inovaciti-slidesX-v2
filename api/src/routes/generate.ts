import { Router } from 'express';
import { generateJson } from '../llm/gemini.js';
import { llmErrorToHttp } from '../llm/errors.js';
import { logger } from '../logger.js';
import { normalizeGenerateResponse } from '../normalize.js';
import { BASE_SYSTEM_INSTRUCTION, buildGeneratePrompt } from '../prompts.js';
import { generateResponseSchema } from '../schema.js';
import { generateBodySchema, parseBody, warnIfInjectionAttempt } from '../validation.js';

export const generateRouter = Router();

generateRouter.post('/', async (req, res) => {
  const body = parseBody(generateBodySchema, req, res);
  if (!body) return;
  warnIfInjectionAttempt(body.idea, 'generate', req.requestId);

  try {
    const raw = await generateJson<unknown>({
      systemInstruction: BASE_SYSTEM_INSTRUCTION,
      prompt: buildGeneratePrompt({ idea: body.idea, size: body.size, style: body.style, assets: body.assets }),
      responseSchema: generateResponseSchema,
    });
    const result = normalizeGenerateResponse(raw);
    if (result.slides.length === 0) {
      res.status(502).json({ error: 'O modelo não retornou slides válidos. Tenta de novo.' });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error({ request_id: req.requestId, err }, 'falha em POST /api/presentations/generate');
    const mapped = llmErrorToHttp(err, 'Falha ao gerar a apresentação. Tenta de novo em instantes.');
    if (mapped.retryAfter) res.setHeader('Retry-After', String(mapped.retryAfter));
    res.status(mapped.status).json(mapped.body);
  }
});
