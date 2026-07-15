/**
 * Rate limit em duas camadas por rota de IA: teto por IP e teto por cookie de sessão.
 * A camada de sessão protege o caso de muitos usuários atrás do mesmo IP e também
 * impede que um único navegador monopolize o teto do IP inteiro.
 * Armazenamento em memória por instância (Redis fica pra quando houver escala horizontal).
 */
import { rateLimit, ipKeyGenerator, type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, RequestHandler, Response } from 'express';
import { config } from '../config.js';

const HOUR_MS = 60 * 60 * 1000;

const LIMIT_MESSAGE = { error: 'Muitas requisições num intervalo curto. Espera um pouco e tenta de novo.' };

function limitHandler(_req: Request, res: Response): void {
  res.setHeader('Retry-After', '60');
  res.status(429).json(LIMIT_MESSAGE);
}

interface LimiterOptions {
  /**
   * Quando true, só requisições que FALHARAM (status >= 400) consomem o teto.
   * É o modo certo pra login: quem erra a senha continua bloqueado por força
   * bruta, mas entrar dez vezes na mesma hora nunca vira 429 pra uso legítimo.
   */
  skipSuccessfulRequests?: boolean;
}

function ipLimiter(limitPerHour: number, options: LimiterOptions = {}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: HOUR_MS,
    limit: limitPerHour,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    handler: limitHandler,
  });
}

function sessionLimiter(limitPerHour: number, options: LimiterOptions = {}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: HOUR_MS,
    limit: limitPerHour,
    standardHeaders: false,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    keyGenerator: (req) => req.sessionId ?? ipKeyGenerator(req.ip ?? ''),
    handler: limitHandler,
  });
}

function dual(ipPerHour: number, sessionPerHour: number, options: LimiterOptions = {}): RequestHandler[] {
  return [ipLimiter(ipPerHour, options), sessionLimiter(sessionPerHour, options)];
}

export const generateLimits = dual(config.rate.generateIpPerHour, config.rate.generateSessionPerHour);
export const chatLimits = dual(config.rate.chatIpPerHour, config.rate.chatSessionPerHour);
export const improveLimits = dual(config.rate.improveIpPerHour, config.rate.improveSessionPerHour);
export const imageLimits = dual(config.rate.imageIpPerHour, config.rate.imageSessionPerHour);
// Login: o teto vale só pra tentativas ERRADAS. Contar sucesso bloqueava a equipe
// no uso normal (10 logins na mesma hora davam 429) sem ganho nenhum de segurança.
export const authLimits = dual(config.rate.authIpPerHour, config.rate.authSessionPerHour, {
  skipSuccessfulRequests: true,
});
// Geração de imagem com IA: a ação mais cara do app, teto propositalmente baixo.
export const imageGenLimits = dual(config.rate.imageGenIpPerHour, config.rate.imageGenSessionPerHour);
// Leitura do Notion: barata (só requests HTTP normais), teto mais folgado.
export const notionLimits = dual(config.rate.notionIpPerHour, config.rate.notionSessionPerHour);
// Ditado por voz: paga à OpenAI, mas barata perto de imagem -- teto no nível do chat.
export const transcribeLimits = dual(config.rate.transcribeIpPerHour, config.rate.transcribeSessionPerHour);
