import { Router } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { clearAuthCookie, isAuthenticated, issueAuthCookie, safeEqual } from '../auth/session.js';
import { loginBodySchema, parseBody } from '../validation.js';

export const authRouter = Router();

authRouter.get('/status', (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

authRouter.post('/login', (req, res) => {
  const body = parseBody(loginBodySchema, req, res);
  if (!body) return;

  if (!config.authUsername || !config.authPassword) {
    logger.error('login chamado sem SITE_USERNAME/SITE_PASSWORD configurados no servidor');
    res.status(503).json({ error: 'Login não configurado no servidor. Fala com quem administra o deploy.' });
    return;
  }

  const ok = safeEqual(body.username, config.authUsername) && safeEqual(body.password, config.authPassword);
  if (!ok) {
    logger.warn({ request_id: req.requestId }, 'tentativa de login com credenciais inválidas');
    res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    return;
  }

  issueAuthCookie(res);
  res.json({ ok: true });
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});
