import { Router } from 'express';
import { generateJson } from '../llm/gemini.js';
import { llmErrorToHttp } from '../llm/errors.js';
import { logger } from '../logger.js';
import { normalizeSlide } from '../normalize.js';
import { CHAT_SYSTEM_INSTRUCTION, buildChatPrompt } from '../intelligence/index.js';
import { chatResponseSchema } from '../schema.js';
import { chatBodySchema, parseBody, warnIfInjectionAttempt } from '../validation.js';
import type { GeneratedSlide } from '../types.js';

export const chatRouter = Router();

/** Mesma regra do /api/slides/improve: slide de capa/separador/encerramento não é editável por aqui. */
const NON_EDITABLE_LAYOUTS = new Set(['cover', 'section', 'closing']);

interface ChatModelResponse {
  reply?: unknown;
  editSlideIndex?: unknown;
  editInstruction?: unknown;
}

chatRouter.post('/', async (req, res) => {
  const body = parseBody(chatBodySchema, req, res);
  if (!body) return;
  warnIfInjectionAttempt(body.message, 'chat', req.requestId);

  const slides = body.slides.map(normalizeSlide).filter((s): s is GeneratedSlide => s !== null);

  try {
    const raw = await generateJson<ChatModelResponse>({
      systemInstruction: CHAT_SYSTEM_INSTRUCTION,
      prompt: buildChatPrompt({
        idea: body.idea,
        goal: body.goal,
        style: body.style,
        slides,
        history: body.history,
        message: body.message,
        attachmentNames: body.attachments.map((a) => a.name),
        currentSlideIndex: body.currentSlideIndex,
      }),
      responseSchema: chatResponseSchema,
      images: body.attachments.map((a) => ({ mimeType: a.mimeType, dataBase64: a.dataBase64 })),
    });

    const reply = typeof raw.reply === 'string' && raw.reply.trim().length > 0 ? raw.reply.trim() : 'Certo.';

    // O modelo só edita quando os dois campos vêm juntos e apontam pra um slide
    // real e editável -- qualquer coisa fora disso, a mensagem é só conversa (o
    // pedido pode ter sido vago demais, ou mirar um slide de capa/seção/encerramento).
    const index = typeof raw.editSlideIndex === 'number' ? Math.trunc(raw.editSlideIndex) : null;
    const instruction = typeof raw.editInstruction === 'string' ? raw.editInstruction.trim() : '';
    const targetSlide = index !== null && index >= 1 && index <= slides.length ? slides[index - 1] : undefined;
    const edit =
      targetSlide && instruction.length > 0 && !NON_EDITABLE_LAYOUTS.has(targetSlide.layout)
        ? { slideIndex: index as number, instruction }
        : undefined;

    res.json({ reply, edit });
  } catch (err) {
    logger.error({ request_id: req.requestId, err }, 'falha em POST /api/chat');
    const mapped = llmErrorToHttp(err, 'Deu erro ao responder. Tenta de novo.');
    if (mapped.retryAfter) res.setHeader('Retry-After', String(mapped.retryAfter));
    res.status(mapped.status).json(mapped.body);
  }
});
