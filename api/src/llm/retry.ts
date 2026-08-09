/**
 * Timeout + retry com backoff exponencial e jitter pra toda chamada de IA.
 * Retry só em erro transitório (429, 5xx, rede): resposta malformada ou request
 * inválida não melhora repetindo, então falha na hora.
 */
import { setTimeout as sleep } from 'node:timers/promises';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { CircuitBreaker } from './circuitBreaker.js';
import { LlmError, classifyLlmError } from './errors.js';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

// Um breaker por label ("gemini.generateJson", "gemini.generateText"...), vivo
// pela vida do processo — é o que faz "5 falhas seguidas" ter sentido: precisa
// acumular entre requests diferentes, não só dentro de uma chamada.
const breakers = new Map<string, CircuitBreaker>();
function breakerFor(label: string): CircuitBreaker {
  let breaker = breakers.get(label);
  if (!breaker) {
    breaker = new CircuitBreaker(label);
    breakers.set(label, breaker);
  }
  return breaker;
}

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
  const breaker = breakerFor(label);
  // Circuito já aberto: falha JÁ, sem entrar no loop de tentativa+backoff —
  // sabemos de antemão que vai falhar, então nem essa espera faz sentido.
  breaker.assertClosed();
  let lastError: LlmError | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn(controller.signal);
      breaker.recordSuccess();
      return result;
    } catch (err) {
      lastError = classifyLlmError(err, fallbackMessage);
      // Mesmo filtro do CircuitBreaker.run(): timeout e request malformada não
      // indicam provedor fora do ar, só 5xx/rede/rate-limit contam.
      if (lastError.category === 'server' || lastError.category === 'network' || lastError.category === 'rate_limit') {
        breaker.recordFailure();
      }

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