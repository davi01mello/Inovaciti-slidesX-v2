/**
 * Cliente da geração de imagem com IA (ver api/src/routes/images.ts). É a ação mais
 * cara do editor -- essa é a única ponte com o backend, então qualquer limite ou
 * mensagem de erro do servidor (503 sem chave configurada, 429 de rate limit) passa
 * direto pro toast de quem chamou, sem reformular aqui.
 */
import { AiClientError } from './aiClient';

export interface GeneratedAiImage {
  dataUrl: string;
  width: number;
  height: number;
}

interface GenerateImageResponse {
  dataUrl: string;
  width: number;
  height: number;
}

export async function generateAiImage(prompt: string): Promise<GeneratedAiImage> {
  const res = await fetch('/api/images/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (res.status === 503) {
      throw new AiClientError(data?.error ?? 'Geração de imagem não configurada nesse servidor.', 'unavailable');
    }
    if (res.status === 429) {
      throw new AiClientError('Limite de gerações de imagem atingido. Tenta de novo daqui a pouco.', 'rate_limit');
    }
    throw new AiClientError(data?.error ?? 'Não consegui gerar a imagem agora. Tenta de novo.', 'server');
  }

  const data = (await res.json()) as GenerateImageResponse;
  return data;
}
