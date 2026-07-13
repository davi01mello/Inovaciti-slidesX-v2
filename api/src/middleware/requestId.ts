/**
 * Injeta um request_id (UUID v4) em toda request, exposto também no header de resposta
 * pra correlação entre o erro que o usuário vê e a linha de log correspondente.
 */
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
    sessionId?: string;
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
