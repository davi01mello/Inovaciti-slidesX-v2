import type { NextFunction, Request, Response } from 'express';
import { isAuthenticated } from '../auth/session.js';

const PUBLIC_PATHS = new Set(['/api/health', '/api/auth/login', '/api/auth/status', '/api/auth/logout']);

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
