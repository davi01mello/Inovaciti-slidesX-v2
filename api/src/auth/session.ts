/**
 * Sessão do login compartilhado, num cookie assinado e COM validade de verdade:
 *
 *   citi_auth = "<expiraEmMs>.<hmac-sha256(expiraEmMs)>"
 *
 * - A expiração vive DENTRO do token e é verificada no servidor. maxAge de cookie
 *   é cortesia pro navegador, não segurança: um cookie roubado não pode valer pra
 *   sempre só porque o cliente promete apagá-lo.
 * - A validade é deslizante: cada visita autenticada reemite o cookie por mais 30
 *   dias (ver routes/auth). Quem usa o app nunca é deslogado; um token esquecido
 *   ou vazado morre sozinho em até 30 dias.
 * - A chave de assinatura deriva das DUAS credenciais: trocar usuário ou senha
 *   revoga instantaneamente toda sessão emitida antes.
 * - Servidor sem credenciais configuradas NÃO tem sessão válida. Sem isso, um
 *   token forjado com a chave de fallback (pública, o código é aberto) autenticava
 *   qualquer um num deploy mal configurado.
 * - Adulterou a expiração? A assinatura deixa de bater. Token do formato antigo
 *   (v1, sem ponto)? Inválido, e a pessoa só faz login de novo uma vez.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import { config } from '../config.js';

export const AUTH_COOKIE_NAME = 'citi_auth';
const TOKEN_SCOPE = 'citi-slides-auth-v2';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

/** Opções idênticas em emitir e limpar: clearCookie só funciona com o mesmo trio. */
const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: config.isProduction,
  path: '/',
};

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * Comparação em tempo constante que não vaza NEM o tamanho do segredo: compara
 * hashes de tamanho fixo em vez dos valores crus (timingSafeEqual exige buffers
 * iguais, e um early-return por tamanho já é um oráculo).
 */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

function isConfigured(): boolean {
  return Boolean(config.authUsername && config.authPassword);
}

function signingKey(): Buffer {
  return digest(`${TOKEN_SCOPE}:${config.authUsername}:${config.authPassword}`);
}

function signExpiry(expiresAtMs: number): string {
  return createHmac('sha256', signingKey()).update(`${TOKEN_SCOPE}.${expiresAtMs}`).digest('hex');
}

export function issueAuthCookie(res: Response): void {
  const expiresAtMs = Date.now() + SESSION_TTL_MS;
  res.cookie(AUTH_COOKIE_NAME, `${expiresAtMs}.${signExpiry(expiresAtMs)}`, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_TTL_MS,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, COOKIE_OPTIONS);
}

export function isAuthenticated(req: Request): boolean {
  if (!isConfigured()) return false;

  const cookie = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE_NAME];
  if (!cookie) return false;

  const dot = cookie.indexOf('.');
  if (dot <= 0) return false;

  const expiresAtMs = Number(cookie.slice(0, dot));
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= Date.now()) return false;

  return safeEqual(cookie.slice(dot + 1), signExpiry(expiresAtMs));
}
