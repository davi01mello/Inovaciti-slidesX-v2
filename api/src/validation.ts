/**
 * Ponto único de validação de entrada: constantes de domínio (antes duplicadas em 4 rotas)
 * e schemas Zod com limites de tamanho por campo. Toda rota valida o body aqui antes de
 * qualquer trabalho. Falha vira 400 com mensagem clara em português, nunca stack do Zod.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from './logger.js';
import type { PresentationGoal, VisualStyle } from './types.js';

export const VALID_GOALS = ['convince', 'inform', 'inspire', 'train'] as const satisfies readonly PresentationGoal[];
export const VALID_STYLES = ['minimal', 'balanced', 'bold'] as const satisfies readonly VisualStyle[];

// IDs vêm do createId() do front (base64url). Só esse charset pra nunca virar caminho de arquivo.
export const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

// Enums com fallback: valor fora do enum cai no neutro em vez de derrubar a request.
const goalSchema = z.enum(VALID_GOALS).catch('inform');
const styleSchema = z.enum(VALID_STYLES).catch('balanced');

const richRunSchema = z.object({
  text: z.string().max(2000, 'cada trecho de texto pode ter no máximo 2000 caracteres'),
  bold: z.boolean().optional(),
  highlight: z.boolean().optional(),
});

const richTextSchema = z.array(richRunSchema).max(50, 'texto com trechos demais');

const blockSchema = z
  .object({
    kind: z.string().max(32),
    align: z.string().max(16).optional(),
    content: richTextSchema.optional(),
    items: z.array(richTextSchema).max(12, 'lista com itens demais (máximo 12)').optional(),
  })
  .passthrough();

const slideSchema = z
  .object({
    layout: z.string().max(32),
    blocks: z.array(blockSchema).max(15, 'slide com blocos demais (máximo 15)'),
  })
  .passthrough();

const slidesArraySchema = z.array(slideSchema).max(50, 'apresentação com slides demais (máximo 50)');

const assetSchema = z.object({
  name: z.string().max(200, 'nome de arquivo com no máximo 200 caracteres'),
  kind: z.enum(['image', 'pdf', 'logo', 'other']).catch('other'),
});

const historyMessageSchema = z.object({
  author: z.enum(['ai', 'user']),
  text: z.string().max(4000, 'mensagem do histórico longa demais (máximo 4000 caracteres)'),
});

export const generateBodySchema = z.object({
  idea: z
    .string({ required_error: 'idea é obrigatório', invalid_type_error: 'idea precisa ser texto' })
    .min(100, 'a ideia precisa ter pelo menos 100 caracteres')
    .max(10_000, 'a ideia pode ter no máximo 10000 caracteres'),
  // O wizard sempre manda a quantidade exata; valor ausente ou inválido cai no padrão da casa.
  slideCount: z.number().int().min(1).max(50).default(8).catch(8),
  goal: goalSchema.default('inform'),
  audience: z.string().max(200, 'descrição de público com no máximo 200 caracteres').default(''),
  style: styleSchema.default('balanced'),
  assets: z.array(assetSchema).max(20, 'máximo de 20 anexos').default([]),
});

// Anexos do chat: só imagens leves (o front reduz antes de mandar). O base64 de ~2.8M
// chars equivale a ~2MB de imagem, folga suficiente pra uma foto reduzida a 1280px.
const chatAttachmentSchema = z.object({
  name: z.string().max(200, 'nome de arquivo com no máximo 200 caracteres'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'anexo precisa ser imagem (jpeg, png ou webp)' }),
  }),
  dataBase64: z.string().min(1).max(2_800_000, 'imagem anexada grande demais (reduza antes de mandar)'),
});

export const chatBodySchema = z.object({
  message: z
    .string({ required_error: 'message é obrigatório', invalid_type_error: 'message precisa ser texto' })
    .min(1, 'a mensagem não pode ser vazia')
    .max(24_000, 'a mensagem pode ter no máximo 24000 caracteres'),
  idea: z.string().max(10_000).default(''),
  goal: goalSchema.default('inform'),
  style: styleSchema.default('balanced'),
  slides: slidesArraySchema.default([]),
  history: z
    .array(historyMessageSchema)
    .max(20, 'histórico com mensagens demais (máximo 20)')
    .default([]),
  attachments: z.array(chatAttachmentSchema).max(4, 'máximo de 4 imagens por mensagem').default([]),
});

export const improveBodySchema = z.object({
  slide: slideSchema,
  idea: z.string().max(10_000).default(''),
  goal: goalSchema.default('inform'),
  style: styleSchema.default('balanced'),
  otherSlides: slidesArraySchema.default([]),
});

export const loginBodySchema = z.object({
  username: z.string({ required_error: 'usuário é obrigatório' }).min(1, 'usuário é obrigatório').max(100),
  password: z.string({ required_error: 'senha é obrigatória' }).min(1, 'senha é obrigatória').max(200),
});

/**
 * Valida o body de uma request. Em caso de falha responde 400 com o primeiro problema
 * apontando o campo, em português, e retorna null pro handler encerrar.
 */
export function parseBody<S extends z.ZodTypeAny>(schema: S, req: Request, res: Response): z.infer<S> | null {
  const result = schema.safeParse(req.body);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = issue && issue.path.length > 0 ? issue.path.join('.') : 'body';
  const detail = issue?.message ?? 'valor inválido';
  res.status(400).json({ error: `Campo inválido: ${field} (${detail}).` });
  return null;
}

// Heurística leve de prompt injection: só registra a tentativa em warning, sem bloquear.
// A intenção é visibilidade, não paranoia. O system prompt do modelo já delimita o papel.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all )?previous (instructions|prompts)/i,
  /disregard (all )?(previous|prior) instructions/i,
  /\bsystem\s*:/i,
  /you are now\b/i,
  /ignore as instruç/i,
  /esqueça (as|suas) instruç/i,
  /```(system|assistant)/i,
];

export function warnIfInjectionAttempt(text: string, route: string, requestId: string): void {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      logger.warn({ route, request_id: requestId, pattern: pattern.source }, 'possível tentativa de prompt injection');
      return;
    }
  }
}
