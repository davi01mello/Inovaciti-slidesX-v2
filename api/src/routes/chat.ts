import { Router } from 'express';
import { generateText } from '../llm/gemini.js';
import { llmErrorToHttp } from '../llm/errors.js';
import { logger } from '../logger.js';
import { normalizeSlide } from '../normalize.js';
import { CHAT_SYSTEM_INSTRUCTION, buildChatPrompt } from '../intelligence/index.js';
import { chatBodySchema, parseBody, warnIfInjectionAttempt } from '../validation.js';
import type { GeneratedSlide } from '../types.js';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
  const body = parseBody(chatBodySchema, req, res);
  if (!body) return;
  warnIfInjectionAttempt(body.message, 'chat', req.requestId);

  const slides = body.slides.map(normalizeSlide).filter((s): s is GeneratedSlide => s !== null);

  try {
    const reply = await generateText({
      systemInstruction: CHAT_SYSTEM_INSTRUCTION,
      prompt: buildChatPrompt({
        idea: body.idea,
        goal: body.goal,
        style: body.style,
        slides,
        history: body.history,
        message: body.message,
        attachmentNames: body.attachments.map((a) => a.name),
      }),
      images: body.attachments.map((a) => ({ mimeType: a.mimeType, dataBase64: a.dataBase64 })),
    });
    res.json({ reply: reply.trim() });
  } catch (err) {
    logger.error({ request_id: req.requestId, err }, 'falha em POST /api/chat');
    const mapped = llmErrorToHttp(err, 'Deu erro ao responder. Tenta de novo.');
    if (mapped.retryAfter) res.setHeader('Retry-After', String(mapped.retryAfter));
    res.status(mapped.status).json(mapped.body);
  }
});
