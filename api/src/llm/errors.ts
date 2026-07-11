/**
 * Erro tipado de chamada de IA. A categoria decide o status HTTP e a mensagem
 * que o front mostra, então toda falha de Gemini/OpenAI passa a ser classificada.
 */
export type LlmErrorCategory = 'timeout' | 'rate_limit' | 'bad_response' | 'server' | 'config' | 'network';

export class LlmError extends Error {
  readonly category: LlmErrorCategory;

  constructor(category: LlmErrorCategory, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'LlmError';
    this.category = category;
  }
}

interface StatusCarrier {
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
  name?: unknown;
}

/** Extrai o status HTTP de erros dos SDKs (OpenAI APIError, Gemini ApiError). */
export function statusOf(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const carrier = err as StatusCarrier;
  if (typeof carrier.status === 'number') return carrier.status;
  if (typeof carrier.statusCode === 'number') return carrier.statusCode;
  return null;
}

export function isAbortError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // O SDK da OpenAI aborta com APIUserAbortError ("Request was aborted."), que precisa
  // ser classificado como timeout pra ganhar retry e virar 504 em vez de 502.
  return (
    err.name === 'AbortError' ||
    err.name === 'TimeoutError' ||
    err.name === 'APIUserAbortError' ||
    /request was aborted/i.test(err.message)
  );
}

export function isNetworkishError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as StatusCarrier).code;
  if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN') return true;
  const message = err instanceof Error ? err.message : '';
  return /fetch failed|network|socket hang up/i.test(message);
}

export interface LlmHttpError {
  status: number;
  retryAfter?: number;
  body: { error: string; category: string };
}

/**
 * Mapeia uma falha de IA pra resposta HTTP com categoria que o front entende:
 * timeout vira 504, sobrecarga vira 503 com Retry-After, o resto vira 502.
 */
export function llmErrorToHttp(err: unknown, fallback: string): LlmHttpError {
  if (err instanceof LlmError) {
    switch (err.category) {
      case 'config':
        return { status: 503, body: { error: err.message, category: 'unavailable' } };
      case 'timeout':
        return { status: 504, body: { error: 'A IA demorou demais pra responder. Tenta de novo.', category: 'timeout' } };
      case 'rate_limit':
        return {
          status: 503,
          retryAfter: 30,
          body: { error: 'Sistema em carga. Tenta de novo em alguns segundos.', category: 'rate_limit' },
        };
      case 'bad_response':
        return { status: 502, body: { error: fallback, category: 'bad_response' } };
      case 'network':
      case 'server':
        return { status: 502, body: { error: fallback, category: 'server' } };
    }
  }
  return { status: 502, body: { error: fallback, category: 'server' } };
}

/** Converte qualquer erro de SDK numa LlmError com categoria. */
export function classifyLlmError(err: unknown, fallbackMessage: string): LlmError {
  if (err instanceof LlmError) return err;
  if (isAbortError(err)) return new LlmError('timeout', 'A IA demorou demais pra responder.', { cause: err });
  const status = statusOf(err);
  if (status === 429) return new LlmError('rate_limit', 'O provedor de IA está limitando as chamadas agora.', { cause: err });
  if (status !== null && status >= 500) return new LlmError('server', fallbackMessage, { cause: err });
  if (isNetworkishError(err)) return new LlmError('network', 'Falha de rede ao falar com o provedor de IA.', { cause: err });
  return new LlmError('bad_response', fallbackMessage, { cause: err });
}
