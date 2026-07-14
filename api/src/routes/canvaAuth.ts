/**
 * As duas pontas do fluxo OAuth (Authorization Code + PKCE) da Canva. É pra ser aberto
 * no navegador manualmente UMA vez (não é chamado pelo front do CITi Slides):
 *
 *   1. GET /api/canva/oauth/start    -> redireciona pro consentimento da Canva.
 *   2. GET /api/canva/oauth/callback -> troca o code por tokens e salva em disco.
 *
 * Depois disso o refresh token fica persistido (ver canva/tokenStore.ts) e a integração
 * nunca mais pede login -- getValidAccessToken() renova sozinho.
 */
import { Router } from 'express';
import { buildAuthorizeUrl, exchangeAuthorizationCode } from '../canva/client.js';
import { createPkcePair, createState } from '../canva/pkce.js';
import { logger } from '../logger.js';

export const canvaAuthRouter = Router();

// Estado do handshake em memória: sobrevive só o suficiente pro round-trip do navegador
// até a Canva (segundos a minutos). Um único processo, um único usuário -- não precisa
// de nada mais robusto que isso.
const PENDING_TTL_MS = 10 * 60_000;
const pending = new Map<string, { codeVerifier: string; createdAt: number }>();

function sweepExpired(): void {
  const now = Date.now();
  for (const [state, entry] of pending) {
    if (now - entry.createdAt > PENDING_TTL_MS) pending.delete(state);
  }
}

canvaAuthRouter.get('/start', (_req, res) => {
  sweepExpired();
  const { codeVerifier, codeChallenge } = createPkcePair();
  const state = createState();
  pending.set(state, { codeVerifier, createdAt: Date.now() });

  const url = buildAuthorizeUrl({ codeChallenge, state });
  res.redirect(url);
});

canvaAuthRouter.get('/callback', (req, res) => {
  void handleCallback(req, res);
});

async function handleCallback(req: import('express').Request, res: import('express').Response): Promise<void> {
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const state = typeof req.query.state === 'string' ? req.query.state : null;
  const oauthError = typeof req.query.error === 'string' ? req.query.error : null;

  if (oauthError) {
    res.status(400).send(renderResult(false, `A Canva recusou a autorização: ${oauthError}`));
    return;
  }
  if (!code || !state) {
    res.status(400).send(renderResult(false, 'Callback sem code/state -- tenta abrir /api/canva/oauth/start de novo.'));
    return;
  }

  const entry = pending.get(state);
  pending.delete(state); // um state só serve uma vez, use-o ou perca-o.
  if (!entry) {
    res.status(400).send(renderResult(false, 'State desconhecido ou expirado -- tenta abrir /api/canva/oauth/start de novo.'));
    return;
  }

  try {
    await exchangeAuthorizationCode({ code, codeVerifier: entry.codeVerifier });
    logger.info('integração com a Canva autorizada com sucesso');
    res.send(renderResult(true, 'Canva conectada. Pode fechar essa aba e voltar pro CITi Slides.'));
  } catch (err) {
    logger.error({ err }, 'falha ao trocar authorization code da Canva');
    res.status(502).send(renderResult(false, 'Falha ao trocar o código de autorização com a Canva. Tenta de novo.'));
  }
}

function renderResult(success: boolean, message: string): string {
  const color = success ? '#00E676' : '#ff8a8a';
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>CITi Slides x Canva</title></head>
<body style="background:#050505;color:#F5F7FA;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="max-width:420px;text-align:center;padding:32px;">
    <div style="color:${color};font-size:15px;font-weight:600;margin-bottom:8px;">${success ? 'Tudo certo' : 'Deu errado'}</div>
    <div style="font-size:14px;color:#C8CDD4;line-height:1.5;">${message}</div>
  </div>
</body></html>`;
}
