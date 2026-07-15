/**
 * Geração de imagem sob demanda (OpenAI Images, gpt-image-1) pro editor de slides.
 * É a ação mais cara do app -- por isso fica isolada aqui, atrás de rate limit
 * dedicado (ver middleware/rateLimits.ts) e da qualidade configurável em config.ts
 * (default 'low', nunca surpreende a fatura sem intenção explícita).
 */
import { config } from '../config.js';
import { logger } from '../logger.js';

const IMAGES_URL = 'https://api.openai.com/v1/images/generations';

// Fixo em quadrado: encaixa como Decoration solta no slide (mesma lógica dos
// elementos 3D da marca), sem decisão extra de proporção pro usuário.
const IMAGE_SIZE = '1024x1024';

// Empurra o resultado pra caber como elemento solto no slide: objeto único,
// sem fundo, sem texto -- nunca uma cena/composição inteira.
const STYLE_SUFFIX =
  ', isolated 3D render of a single object, transparent background, no text, no watermark, professional studio lighting';

export class ImageGenError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ImageGenError';
  }
}

function requireApiKey(): void {
  if (!config.openaiApiKey) {
    throw new ImageGenError('Geração de imagem não configurada no servidor (falta OPENAI_API_KEY em api/.env).', 'not_configured');
  }
}

export interface GeneratedImage {
  /** Base64 puro (sem prefixo data:), pronto pra virar data URL no front. */
  base64: string;
  mimeType: 'image/png';
  width: number;
  height: number;
}

interface ImagesApiResponse {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string };
}

/** Gera uma imagem única a partir de um prompt curto do usuário. */
export async function generateImage(prompt: string): Promise<GeneratedImage> {
  requireApiKey();

  const res = await fetch(IMAGES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: `${prompt}${STYLE_SUFFIX}`,
      size: IMAGE_SIZE,
      quality: config.openaiImageQuality,
      background: 'transparent',
      n: 1,
    }),
  });

  const data = (await res.json().catch(() => null)) as ImagesApiResponse | null;

  if (!res.ok) {
    logger.error({ status: res.status, detail: data?.error?.message }, 'falha ao gerar imagem com a OpenAI');
    throw new ImageGenError(data?.error?.message || `Falha ao gerar imagem (${res.status}).`, 'upstream');
  }

  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    logger.error({ data }, 'resposta da OpenAI sem imagem');
    throw new ImageGenError('A OpenAI não devolveu nenhuma imagem dessa vez. Tenta de novo.', 'empty');
  }

  const [width, height] = IMAGE_SIZE.split('x').map(Number) as [number, number];
  return { base64: b64, mimeType: 'image/png', width, height };
}

/* -------------------------------------------------------------------------- */
/* Ditado por voz (Whisper) -- transcreve o áudio gravado no navegador          */
/* -------------------------------------------------------------------------- */

export class TranscribeError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'TranscribeError';
  }
}

const TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';

// Só pra dar um nome de arquivo com extensão certa no multipart -- a OpenAI usa
// a extensão (não o Content-Type) pra decidir o decoder. webm é o que o
// MediaRecorder do Chrome/Firefox manda por padrão; os outros cobrem Safari e afins.
const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
};

interface TranscriptionApiResponse {
  text?: string;
  error?: { message?: string };
}

/** Transcreve um áudio curto (ditado) pra texto em português. */
export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  if (!config.openaiApiKey) {
    throw new TranscribeError('Ditado por voz não configurado no servidor (falta OPENAI_API_KEY em api/.env).', 'not_configured');
  }

  const extension = EXTENSION_BY_MIME[mimeType] ?? 'webm';
  const buffer = Buffer.from(audioBase64, 'base64');
  if (buffer.length === 0) {
    throw new TranscribeError('Áudio vazio -- grave de novo.', 'empty');
  }

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), `ditado.${extension}`);
  form.append('model', 'whisper-1');
  // Só um empurrão de idioma -- o Whisper detecta sozinho, mas fixar 'pt' evita
  // que um trecho curto e ambíguo caia em inglês por engano.
  form.append('language', 'pt');

  const res = await fetch(TRANSCRIPTIONS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.openaiApiKey}` },
    body: form,
  });

  const data = (await res.json().catch(() => null)) as TranscriptionApiResponse | null;

  if (!res.ok) {
    logger.error({ status: res.status, detail: data?.error?.message }, 'falha ao transcrever áudio na OpenAI');
    throw new TranscribeError(data?.error?.message || `Falha ao transcrever áudio (${res.status}).`, 'upstream');
  }

  const text = data?.text?.trim();
  if (!text) {
    throw new TranscribeError('Não consegui entender esse áudio. Tenta falar de novo, mais perto do microfone.', 'empty');
  }
  return text;
}
