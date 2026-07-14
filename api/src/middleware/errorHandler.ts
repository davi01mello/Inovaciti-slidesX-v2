/**
 * Última linha de defesa: qualquer exceção não capturada vira JSON limpo com request_id.
 * Stack completa vai pro log interno, nunca pra resposta HTTP.
 */
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../logger.js';

interface HttpishError {
  status?: number;
  statusCode?: number;
  type?: string;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const httpish = (err ?? {}) as HttpishError;

  // body-parser marca JSON malformado e payload acima do limite com status próprio.
  const status =
    typeof httpish.status === 'number' ? httpish.status : typeof httpish.statusCode === 'number' ? httpish.statusCode : 500;

  logger.error(
    { request_id: req.requestId, method: req.method, url: req.originalUrl, err },
    'exceção não capturada na request',
  );

  if (res.headersSent) return;

  const message =
    status === 400
      ? 'Corpo da requisição inválido.'
      : status === 403
        ? 'Origem não autorizada.'
        : status === 413
          ? 'Payload grande demais (limite de 1mb).'
          : 'Erro interno do servidor. Tenta de novo em instantes.';

  res.status(status >= 400 && status < 600 ? status : 500).json({ error: message, request_id: req.requestId });
}
