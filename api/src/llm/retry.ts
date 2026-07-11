/**
 * Timeout + retry com backoff exponencial e jitter pra toda chamada de IA.
 * Retry só em erro transitório (429, 5xx, rede): resposta malformada ou request
 * inválida não melhora repetindo, então falha na hora.
 */
import { setTimeout as sleep } from 'node:timers/promises';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { LlmError, classifyLlmError } from './errors.js';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

function retryDelayMs(attempt: number): number {
  const jitter = Math.floor(Math.random() * 500);
  return BASE_DELAY_MS * 2 ** attempt + jitter;
}

function isRetryable(err: LlmError): boolean {
  return (
    err.category === 'rate_limit' ||
    err.category === 'server' ||
    err.category === 'network' ||
    err.category === 'timeout'
  );
}

interface RetryOptions {
  /** Teto por tentativa. Default: config.llmTimeoutMs. Imagem usa config.imageTimeoutMs. */
  timeoutMs?: number;
}

export async function callWithRetry<T>(
  label: string,
  fn: (signal: AbortSignal) => Promise<T>,
  fallbackMessage: string,
  options: RetryOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? config.llmTimeoutMs;
  let lastError: LlmError | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fn(controller.signal);
    } catch (err) {
      lastError = classifyLlmError(err, fallbackMessage);

      if (!isRetryable(lastError) || attempt === MAX_ATTEMPTS - 1) {
        throw lastError;
      }

      const delay = retryDelayMs(attempt);

      logger.warn(
        {
          label,
          attempt: attempt + 1,
          category: lastError.category,
          retry_in_ms: delay,
        },
        'chamada de IA falhou, tentando de novo',
      );

      await sleep(delay);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new LlmError('server', fallbackMessage);
}