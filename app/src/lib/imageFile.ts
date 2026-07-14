/**
 * Leitura e redução de imagens no navegador — a ponte entre um File solto
 * (anexo do chat, upload pro slide, drag & drop) e os limites reais do sistema:
 * a API só aceita jpeg/png/webp com base64 de até ~2.8M chars, e o slide
 * persiste data URLs no localStorage, então TODA imagem passa por downscale
 * antes de circular.
 */

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AcceptedImageMime = (typeof ACCEPTED_IMAGE_TYPES)[number];

/** Valor do atributo accept dos inputs de arquivo de imagem. */
export const IMAGE_ACCEPT_ATTR = 'image/jpeg,image/png,image/webp';

export function isAcceptedImageFile(file: File): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
}

/** Filtra só as imagens aceitas de uma lista de arquivos (drop/paste trazem de tudo). */
export function pickImageFiles(files: Iterable<File>): File[] {
  return Array.from(files).filter(isAcceptedImageFile);
}

export interface LoadedImage {
  /** Data URL já reduzida, pronta pra <img src> e pra persistir. */
  dataUrl: string;
  mimeType: AcceptedImageMime;
  width: number;
  height: number;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Não consegui ler a imagem "${file.name}".`));
    };
    img.src = url;
  });
}

/**
 * Desenha a imagem num canvas limitado a maxDim e devolve o data URL.
 * PNGs viram JPEG quando não têm transparência aparente (fotos salvas como PNG
 * estouram qualquer limite); com transparência, mantêm PNG.
 */
function drawScaled(img: HTMLImageElement, maxDim: number, mimeType: AcceptedImageMime, quality: number): LoadedImage {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL(mimeType, quality);
  return { dataUrl, mimeType, width, height };
}

/** Detecta transparência amostrando o canto e o centro (barato e suficiente pra decidir JPEG vs PNG). */
function hasTransparency(img: HTMLImageElement): boolean {
  const probe = document.createElement('canvas');
  const side = 24;
  probe.width = side;
  probe.height = side;
  const ctx = probe.getContext('2d');
  if (!ctx) return true;
  ctx.drawImage(img, 0, 0, side, side);
  const data = ctx.getImageData(0, 0, side, side).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! < 250) return true;
  }
  return false;
}

function outputTypeFor(file: File, img: HTMLImageElement): AcceptedImageMime {
  if (file.type === 'image/png' && hasTransparency(img)) return 'image/png';
  if (file.type === 'image/webp' && hasTransparency(img)) return 'image/webp';
  return 'image/jpeg';
}

export interface ChatImageAttachment {
  name: string;
  mimeType: AcceptedImageMime;
  /** Base64 puro (sem o prefixo data:), como a API espera. */
  dataBase64: string;
  /** Data URL da imagem reduzida — preview grande no composer (não persiste). */
  previewUrl: string;
  /** Miniatura leve (~20KB) — é o que fica salvo na bolha do histórico. */
  thumbUrl: string;
}

/** Teto do schema da API (validation.ts): base64 até 2.8M chars. */
const MAX_BASE64_CHARS = 2_800_000;

/**
 * Prepara um File pra ir de anexo no chat: reduz pra no máximo 1568px
 * (padrão confortável pra modelos de visão) e garante o teto de base64 da API,
 * reduzindo de novo se a primeira passada ainda ficou grande.
 */
export async function fileToChatAttachment(file: File): Promise<ChatImageAttachment> {
  const img = await loadImageElement(file);
  const type = outputTypeFor(file, img);

  let result = drawScaled(img, 1568, type, 0.85);
  if (result.dataUrl.length > MAX_BASE64_CHARS) {
    result = drawScaled(img, 1024, type === 'image/png' ? type : 'image/jpeg', 0.8);
  }
  if (result.dataUrl.length > MAX_BASE64_CHARS) {
    result = drawScaled(img, 720, 'image/jpeg', 0.72);
  }

  const thumb = drawScaled(img, 256, 'image/jpeg', 0.75);

  const comma = result.dataUrl.indexOf(',');
  return {
    name: file.name.slice(0, 200),
    mimeType: result.mimeType,
    dataBase64: result.dataUrl.slice(comma + 1),
    previewUrl: result.dataUrl,
    thumbUrl: thumb.dataUrl,
  };
}

/**
 * Prepara um File pra virar imagem NO slide (Decoration com src): reduz pra
 * 1400px — nítido no palco e no export 1920x1080 sem estourar o localStorage.
 */
export async function fileToSlideImage(file: File): Promise<LoadedImage> {
  const img = await loadImageElement(file);
  const type = outputTypeFor(file, img);
  let result = drawScaled(img, 1400, type, 0.85);
  // localStorage guarda a apresentação inteira: segura cada imagem em ~500KB.
  if (result.dataUrl.length > 700_000) {
    result = drawScaled(img, 1000, type === 'image/png' ? type : 'image/jpeg', 0.78);
  }
  return result;
}
