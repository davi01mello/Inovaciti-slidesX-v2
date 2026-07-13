import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { assertProductionConfig, config } from './config.js';
import { logger } from './logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  authLimits,
  chatLimits,
  generateLimits,
  imageGenLimits,
  imageLimits,
  improveLimits,
  notionLimits,
} from './middleware/rateLimits.js';
import { requestId } from './middleware/requestId.js';
import { requireAuth } from './middleware/requireAuth.js';
import { sessionCookie } from './middleware/sessionCookie.js';
import { authRouter } from './routes/auth.js';
import { canvaAuthRouter } from './routes/canvaAuth.js';
import { chatRouter } from './routes/chat.js';
import { exportCanvaRouter } from './routes/exportCanva.js';
import { generateRouter } from './routes/generate.js';
import { imagesRouter } from './routes/images.js';
import { improveRouter } from './routes/improve.js';
import { notionRouter } from './routes/notion.js';

assertProductionConfig((msg) => logger.warn(msg));

const app = express();
app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', 1);

app.use(helmet());

// CORS restrito: origem desconhecida recebe 403 (via errorHandler). Requests sem header
// Origin (curl, health checks, proxy do Vite em dev) passam, o navegador é quem precisa de CORS.
// Em dev, qualquer porta do localhost passa: o Vite troca de porta sozinho quando a 5173
// está ocupada, e isso não pode virar um 403 misterioso.
const isLocalhostOrigin = (origin: string): boolean => /^http:\/\/localhost:\d+$/.test(origin);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.allowedOrigins.includes(origin) || (!config.isProduction && isLocalhostOrigin(origin))) {
        callback(null, true);
        return;
      }
      const err = new Error('Origem não autorizada.') as Error & { status: number };
      err.status = 403;
      callback(err);
    },
    credentials: true,
  }),
);

app.use(compression());
app.use(cookieParser());
app.use(requestId);
app.use(sessionCookie);

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === '/api/health' },
    customProps: (req) => ({ request_id: (req as express.Request).requestId }),
    serializers: {
      req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url }),
      res: (res: { statusCode: number }) => ({ status: res.statusCode }),
    },
  }),
);

// 12mb: o chat aceita até 4 imagens reduzidas (~2MB cada em base64) numa mensagem.
// O export-canva NÃO passa por aqui: ele recebe o .pptx binário e faz o próprio parse (express.raw).
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(config.geminiApiKey),
  });
});

app.post('/api/auth/login', authLimits);
app.use('/api/auth', authRouter);
app.use(requireAuth);

app.use('/api/presentations/generate', generateLimits, generateRouter);
app.use('/api/chat', chatLimits, chatRouter);
app.use('/api/slides/improve', improveLimits, improveRouter);

// export-canva: o POST é uma ação pesada (sobe o pptx e chama a Canva), então consome
// o rate limit dedicado; o GET de status só observa o job.
app.post('/api/presentations/:id/export-canva', imageLimits);
app.use('/api/presentations', exportCanvaRouter);

// Handshake OAuth da integração Canva -- aberto manualmente no navegador, uma vez,
// não é chamado pelo front do CITi Slides. Ver routes/canvaAuth.ts.
app.use('/api/canva/oauth', canvaAuthRouter);

// Geração de imagem com IA: ação mais cara do app, rate limit dedicado e bem apertado.
app.use('/api/images', imageGenLimits, imagesRouter);

// Importar briefing do Notion: só leitura, teto mais folgado que as rotas de IA.
app.use('/api/notion', notionLimits, notionRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.', request_id: req.requestId });
});

app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`citi-slides-api rodando em http://localhost:${config.port}`);
});

// Graceful shutdown: para de aceitar conexões novas e encerra quando as
// requisições em andamento terminarem (teto de 30s).
let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'encerrando servidor HTTP');

  const forceExit = setTimeout(() => {
    logger.warn('timeout de shutdown atingido, saindo mesmo assim');
    process.exit(1);
  }, 30_000);
  forceExit.unref();

  server.close(() => {
    logger.info('servidor HTTP fechado');
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, server };
