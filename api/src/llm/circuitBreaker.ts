/**
 * Circuit breaker leve por serviço: 5 falhas seguidas dentro de 60s abrem o circuito
 * por 30s. Enquanto aberto, toda chamada falha na hora com categoria rate_limit,
 * sem queimar cota num provedor que está fora do ar.
 */
import { logger } from '../logger.js';
import { LlmError } from './errors.js';

const FAILURE_THRESHOLD = 5;
const FAILURE_WINDOW_MS = 60_000;
const OPEN_DURATION_MS = 30_000;

export class CircuitBreaker {
  private failures: number[] = [];
  private openUntil = 0;

  constructor(private readonly name: string) {}

  assertClosed(): void {
    if (Date.now() < this.openUntil) {
      throw new LlmError('rate_limit', 'Sistema em carga. Tenta de novo em alguns segundos.');
    }
  }

  recordSuccess(): void {
    this.failures = [];
  }

  recordFailure(): void {
    const now = Date.now();
    this.failures = this.failures.filter((t) => now - t < FAILURE_WINDOW_MS);
    this.failures.push(now);
    if (this.failures.length >= FAILURE_THRESHOLD && now >= this.openUntil) {
      this.openUntil = now + OPEN_DURATION_MS;
      this.failures = [];
      logger.warn({ breaker: this.name, open_for_ms: OPEN_DURATION_MS }, 'circuit breaker aberto');
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    this.assertClosed();
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      // Timeout e erro de request inválida não indicam provedor fora do ar.
      if (err instanceof LlmError && (err.category === 'server' || err.category === 'network' || err.category === 'rate_limit')) {
        this.recordFailure();
      }
      throw err;
    }
  }
}
