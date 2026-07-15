/**
 * Cliente do ditado por voz (ver api/src/routes/transcribe.ts). Manda o áudio
 * gravado no navegador como base64 puro (sem o prefixo "data:...;base64,"), no
 * mesmo espírito JSON das outras rotas de IA -- nada de multipart aqui.
 */
import { AiClientError } from './aiClient';

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (res.status === 503) {
      throw new AiClientError(data?.error ?? 'Ditado por voz não configurado nesse servidor.', 'unavailable');
    }
    if (res.status === 429) {
      throw new AiClientError('Limite de ditados por voz atingido. Tenta de novo daqui a pouco.', 'rate_limit');
    }
    if (res.status === 422) {
      throw new AiClientError(data?.error ?? 'Não consegui entender esse áudio. Tenta falar de novo.', 'bad_response');
    }
    throw new AiClientError(data?.error ?? 'Não consegui transcrever o áudio agora. Tenta de novo.', 'server');
  }

  const data = (await res.json()) as { text: string };
  return data.text;
}
