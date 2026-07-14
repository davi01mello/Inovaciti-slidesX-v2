/**
 * Cliente da Canva Connect API: troca/renovação de token OAuth (conta única da CITi,
 * ver tokenStore.ts) e as duas chamadas usadas pela integração -- criar e consultar
 * um job de "Design Import" (POST /v1/imports converte o pptx num design editável).
 */
import { config } from '../config.js';
import { logger } from '../logger.js';
import { readTokens, saveTokens, type CanvaTokens } from './tokenStore.js';

const AUTHORIZE_URL = 'https://www.canva.com/api/oauth/authorize';
const TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';
const IMPORTS_URL = 'https://api.canva.com/rest/v1/imports';

// Escopo mínimo pro fluxo de import de design (ver docs/CANVA.md).
export const CANVA_SCOPES = 'design:content:write';

// Renova o access token um pouco antes de expirar de verdade, pra nunca usar um
// token vencido no meio de uma request.
const EXPIRY_SAFETY_MARGIN_MS = 5 * 60_000;

export class CanvaError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'CanvaError';
  }
}

function basicAuthHeader(): string {
  return `Basic ${Buffer.from(`${config.canvaClientId}:${config.canvaClientSecret}`).toString('base64')}`;
}

function requireClientCredentials(): void {
  if (!config.canvaClientId || !config.canvaClientSecret) {
    throw new CanvaError('CANVA_CLIENT_ID / CANVA_CLIENT_SECRET não configurados no servidor (api/.env).');
  }
}

/** Monta a URL de autorização (PKCE) pra onde o usuário é redirecionado no fluxo OAuth. */
export function buildAuthorizeUrl(params: { codeChallenge: string; state: string }): string {
  requireClientCredentials();
  const query = new URLSearchParams({
    code_challenge: params.codeChallenge,
    code_challenge_method: 's256',
    scope: CANVA_SCOPES,
    response_type: 'code',
    client_id: config.canvaClientId,
    state: params.state,
    redirect_uri: config.canvaRedirectUri,
  });
  return `${AUTHORIZE_URL}?${query.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function requestToken(body: URLSearchParams): Promise<CanvaTokens> {
  requireClientCredentials();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    logger.error({ status: res.status, detail }, 'falha ao gerar token da Canva');
    throw new CanvaError(`Falha ao autenticar com a Canva (${res.status}).`);
  }

  const data = (await res.json()) as TokenResponse;
  const tokens: CanvaTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  await saveTokens(tokens);
  return tokens;
}

/** Troca o authorization code (recebido no callback) pelo primeiro par de tokens. */
export async function exchangeAuthorizationCode(params: { code: string; codeVerifier: string }): Promise<CanvaTokens> {
  return requestToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code_verifier: params.codeVerifier,
      code: params.code,
      redirect_uri: config.canvaRedirectUri,
    }),
  );
}

async function refreshTokens(refreshToken: string): Promise<CanvaTokens> {
  return requestToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  );
}

/** Devolve um access token válido, renovando via refresh token quando necessário. Nunca pede pro usuário reautenticar. */
export async function getValidAccessToken(): Promise<string> {
  const tokens = await readTokens();
  if (!tokens) {
    throw new CanvaError(
      'Integração com a Canva ainda não autorizada. Abra /api/canva/oauth/start no navegador uma vez.',
      'not_connected',
    );
  }
  if (Date.now() < tokens.expiresAt - EXPIRY_SAFETY_MARGIN_MS) {
    return tokens.accessToken;
  }
  const fresh = await refreshTokens(tokens.refreshToken);
  return fresh.accessToken;
}

export interface DesignImportResult {
  status: 'in_progress' | 'success' | 'failed';
  editUrl?: string;
  errorMessage?: string;
}

interface DesignImportJobResponse {
  job: {
    id: string;
    status: 'in_progress' | 'success' | 'failed';
    result?: { designs?: Array<{ urls?: { edit_url?: string } }> };
    error?: { code: string; message: string };
  };
}

/** Cria o job assíncrono de importação (o pptx vira um design editável na Canva). */
export async function createDesignImportJob(params: { fileBuffer: Buffer; title: string }): Promise<string> {
  const accessToken = await getValidAccessToken();
  const titleBase64 = Buffer.from(params.title.slice(0, 50)).toString('base64');

  const res = await fetch(IMPORTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Import-Metadata': JSON.stringify({
        title_base64: titleBase64,
        mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }),
    },
    body: params.fileBuffer,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    logger.error({ status: res.status, detail }, 'falha ao criar job de import na Canva');
    throw new CanvaError(`Falha ao enviar o arquivo pra Canva (${res.status}).`);
  }

  const data = (await res.json()) as DesignImportJobResponse;
  return data.job.id;
}

/** Consulta o status de um job de importação. */
export async function getDesignImportJob(jobId: string): Promise<DesignImportResult> {
  const accessToken = await getValidAccessToken();
  const res = await fetch(`${IMPORTS_URL}/${jobId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    logger.error({ status: res.status, detail, jobId }, 'falha ao consultar job de import na Canva');
    throw new CanvaError(`Falha ao consultar o status na Canva (${res.status}).`);
  }

  const data = (await res.json()) as DesignImportJobResponse;
  if (data.job.status === 'success') {
    return { status: 'success', editUrl: data.job.result?.designs?.[0]?.urls?.edit_url };
  }
  if (data.job.status === 'failed') {
    return { status: 'failed', errorMessage: data.job.error?.message ?? 'Falha desconhecida na importação.' };
  }
  return { status: 'in_progress' };
}
