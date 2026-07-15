/**
 * Carrega e valida toda a configuração de ambiente num único ponto tipado.
 * Em produção, chave crítica ausente derruba o boot na hora: erro de configuração
 * tem que aparecer no deploy, nunca silenciosamente por request.
 */
import 'dotenv/config';

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return ['http://localhost:5173'];
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

type OpenAiImageQuality = 'low' | 'medium' | 'high';

/** 'low' por padrão -- geração de imagem é a ação mais cara do app, custo nunca deve surpreender. */
function readImageQuality(): OpenAiImageQuality {
  const raw = process.env.OPENAI_IMAGE_QUALITY;
  return raw === 'low' || raw === 'medium' || raw === 'high' ? raw : 'low';
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

export const config = {
  nodeEnv,
  isProduction,
  port: readInt('PORT', 8787),

  geminiApiKey: process.env.GEMINI_API_KEY ?? '',

  // Login compartilhado (usuário/senha únicos pra toda a equipe, ver auth/session.ts).
  authUsername: process.env.SITE_USERNAME ?? '',
  authPassword: process.env.SITE_PASSWORD ?? '',

  // Integração Canva (Connect API): conta única da CITi, autorizada uma vez via
  // /api/canva/oauth/start. O refresh token fica persistido em disco (ver canva/tokenStore.ts),
  // nunca nessas variáveis de ambiente -- elas só guardam a identidade da integração.
  canvaClientId: process.env.CANVA_CLIENT_ID ?? '',
  canvaClientSecret: process.env.CANVA_CLIENT_SECRET ?? '',
  canvaRedirectUri: process.env.CANVA_REDIRECT_URI ?? '',

  // Geração de imagem sob demanda no editor (OpenAI Images). Ação cara e opcional --
  // sem a chave, o botão continua na UI mas a rota devolve 503 (ver routes/images.ts).
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiImageQuality: readImageQuality(),

  // Importar briefing direto de uma página do Notion (integração interna, ver
  // notion/client.ts). Opcional -- sem a chave, o botão de importar avisa e some.
  notionApiKey: process.env.NOTION_API_KEY ?? '',

  allowedOrigins: readOrigins(),
  trustProxy: process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true',

  llmTimeoutMs: readInt('LLM_TIMEOUT_MS', 60_000),

  logLevel: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

  rate: {
    generateIpPerHour: readInt('RATE_GENERATE_IP', 10),
    generateSessionPerHour: readInt('RATE_GENERATE_SESSION', 5),
    chatIpPerHour: readInt('RATE_CHAT_IP', 60),
    chatSessionPerHour: readInt('RATE_CHAT_SESSION', 30),
    improveIpPerHour: readInt('RATE_IMPROVE_IP', 30),
    improveSessionPerHour: readInt('RATE_IMPROVE_SESSION', 15),
    // Usado pelo export-canva (montar e importar o design é a ação pesada que restou).
    imageIpPerHour: readInt('RATE_IMAGE_IP', 30),
    imageSessionPerHour: readInt('RATE_IMAGE_SESSION', 10),
    authIpPerHour: readInt('RATE_AUTH_IP', 20),
    authSessionPerHour: readInt('RATE_AUTH_SESSION', 10),
    // Geração de imagem com IA: teto baixo de propósito -- é a ação mais cara do app.
    imageGenIpPerHour: readInt('RATE_IMAGE_GEN_IP', 12),
    imageGenSessionPerHour: readInt('RATE_IMAGE_GEN_SESSION', 6),
    notionIpPerHour: readInt('RATE_NOTION_IP', 40),
    notionSessionPerHour: readInt('RATE_NOTION_SESSION', 20),
    // Ditado por voz (transcrição): mais barato que gerar imagem, mas ainda é
    // chamada paga à OpenAI -- teto parecido com o do chat.
    transcribeIpPerHour: readInt('RATE_TRANSCRIBE_IP', 60),
    transcribeSessionPerHour: readInt('RATE_TRANSCRIBE_SESSION', 30),
  },
} as const;

/** Aborta o boot em produção se faltar configuração crítica. Em dev, só avisa. */
export function assertProductionConfig(warn: (msg: string) => void): void {
  const missing: string[] = [];
  if (!config.geminiApiKey) missing.push('GEMINI_API_KEY');
  if (!process.env.ALLOWED_ORIGINS) missing.push('ALLOWED_ORIGINS');
  if (!config.authUsername) missing.push('SITE_USERNAME');
  if (!config.authPassword) missing.push('SITE_PASSWORD');

  if (missing.length === 0) return;

  if (config.isProduction) {
    process.stderr.write(
      `[citi-slides-api] configuração crítica ausente em produção: ${missing.join(', ')}. ` +
        'Preencha as variáveis de ambiente antes de subir o servidor.\n',
    );
    process.exit(1);
  }

  for (const name of missing) {
    warn(`${name} ausente. Endpoints que dependem dela vão falhar até você configurar api/.env`);
  }
}
