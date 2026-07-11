import type { NextFunction, Request, Response } from 'express';
import { isAuthenticated } from '../auth/session.js';

const PUBLIC_PATHS = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/status',
  '/api/auth/logout',
  // Handshake OAuth da Canva: pensado pra ser aberto manualmente no navegador, uma vez,
  // sem depender da sessão do app (ver comentário em routes/canvaAuth.ts) — tem sua própria
  // proteção via o consentimento da própria Canva + PKCE/state, não precisa do gate daqui.
  '/api/canva/oauth/start',
  '/api/canva/oauth/callback',
]);

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_PATHS.has(req.path)) {
    next();
    return;
  }
  if (isAuthenticated(req)) {
    next();
    return;
  }
  res.status(401).json({ error: 'Não autenticado.', request_id: req.requestId });
}
