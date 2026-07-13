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
