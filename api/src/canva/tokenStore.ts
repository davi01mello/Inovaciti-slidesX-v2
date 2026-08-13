/**
 * Persistência local do token da integração Canva: como é uma conta única (a da CITi,
 * não um token por usuário final), guarda tudo num arquivo JSON gitignored em vez de
 * precisar de banco de dados. Autoriza uma vez (via /api/canva/oauth/start) e nunca
 * mais -- o refresh token é salvo de novo a cada renovação, porque a Canva invalida
 * o refresh token anterior a cada troca (cada um só serve uma vez).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { logger } from '../logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Com DATA_DIR setado (deploy com Volume no Railway), o arquivo sobrevive a um
// redeploy -- sem ela, cai no caminho de sempre dentro do próprio repo (dev, ou
// produção sem volume, onde reautorizar depois de um redeploy é esperado).
const TOKEN_FILE = config.dataDir
  ? path.join(config.dataDir, 'canva-tokens.json')
  : path.resolve(__dirname, '..', '..', '.canva-tokens.json');

export interface CanvaTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix ms de quando o access token expira. */
  expiresAt: number;
}

let cached: CanvaTokens | null | undefined;

export async function readTokens(): Promise<CanvaTokens | null> {
  if (cached !== undefined) return cached;
  try {
    const raw = await readFile(TOKEN_FILE, 'utf8');
    cached = JSON.parse(raw) as CanvaTokens;
  } catch {
    cached = null;
  }
  return cached;
}

export async function saveTokens(tokens: CanvaTokens): Promise<void> {
  cached = tokens;
  await mkdir(path.dirname(TOKEN_FILE), { recursive: true });
  await writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf8');
  logger.info({ expiresAt: new Date(tokens.expiresAt).toISOString() }, 'tokens da Canva salvos');
}

export async function clearTokens(): Promise<void> {
  cached = null;
  await writeFile(TOKEN_FILE, '', 'utf8').catch(() => undefined);
}
