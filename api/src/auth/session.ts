import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { config } from '../config.js';

export const AUTH_COOKIE_NAME = 'citi_auth';
const AUTH_PAYLOAD = 'citi-slides-authenticated-v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 180;

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function computeToken(): string {
  return createHmac('sha256', config.authPassword || 'unset').update(AUTH_PAYLOAD).digest('hex');
}

export function issueAuthCookie(res: Response): void {
  res.cookie(AUTH_COOKIE_NAME, computeToken(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProduction,
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
}

export function isAuthenticated(req: Request): boolean {
  const cookie = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE_NAME];
  if (!cookie) return false;
  return safeEqual(cookie, computeToken());
}
