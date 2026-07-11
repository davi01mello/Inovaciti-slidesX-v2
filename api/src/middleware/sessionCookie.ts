/**
 * Identidade fraca por navegador: um cookie httpOnly com UUID v4, criado na primeira request.
 * Não é autenticação. Serve pro rate limit distinguir usuários atrás do mesmo IP (CGNAT,
 * rede da universidade) sem precisar de login.
 */
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

const COOKIE_NAME = 'citi_sid';
const SESSION_ID_SHAPE = /^[0-9a-f-]{36}$/;
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 180;

export function sessionCookie(req: Request, res: Response, next: NextFunction): void {
  const existing = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAME];
  if (existing && SESSION_ID_SHAPE.test(existing)) {
    req.sessionId = existing;
    next();
    return;
  }

  const fresh = randomUUID();
  req.sessionId = fresh;
  res.cookie(COOKIE_NAME, fresh, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProduction,
    maxAge: MAX_AGE_MS,
    path: '/',
  });
  next();
}
