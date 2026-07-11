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

function ipLimiter(limitPerHour: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs: HOUR_MS,
    limit: limitPerHour,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: limitHandler,
  });
}

function sessionLimiter(limitPerHour: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs: HOUR_MS,
    limit: limitPerHour,
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: (req) => req.sessionId ?? ipKeyGenerator(req.ip ?? ''),
    handler: limitHandler,
  });
}

function dual(ipPerHour: number, sessionPerHour: number): RequestHandler[] {
  return [ipLimiter(ipPerHour), sessionLimiter(sessionPerHour)];
}

export const generateLimits = dual(config.rate.generateIpPerHour, config.rate.generateSessionPerHour);
export const chatLimits = dual(config.rate.chatIpPerHour, config.rate.chatSessionPerHour);
export const improveLimits = dual(config.rate.improveIpPerHour, config.rate.improveSessionPerHour);
export const imageLimits = dual(config.rate.imageIpPerHour, config.rate.imageSessionPerHour);
export const authLimits = dual(config.rate.authIpPerHour, config.rate.authSessionPerHour);
