/**
 * Geração dos valores de PKCE (Proof Key for Code Exchange) e do "state" exigidos pelo
 * fluxo OAuth 2.0 Authorization Code da Canva. Ver api/src/routes/canvaAuth.ts.
 */
import { randomBytes, createHash } from 'node:crypto';

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

/** Gera o par code_verifier/code_challenge (SHA-256, base64url) pro passo de autorização. */
export function createPkcePair(): PkcePair {
  const codeVerifier = randomBytes(96).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

/** Gera o valor de "state", usado como defesa contra CSRF no callback. */
export function createState(): string {
  return randomBytes(96).toString('base64url');
}
