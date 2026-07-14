import { createId } from '@/lib/id';
import type { LoadedImage } from '@/lib/imageFile';

/**
 * Imagens que o usuário subiu nesta sessão do navegador.
 *
 * Vivem em memória (nunca persistem: quem é usada num slide já vai salva no
 * próprio slide) e existem por dois motivos:
 * - o painel "Imagens" do dock mostra as recentes pra reusar sem re-upload;
 * - o drag & drop carrega só o ID no dataTransfer — um data URL de centenas de
 *   KB no payload de arrasto trava o navegador.
 */

export interface SessionUpload extends LoadedImage {
  id: string;
}

const MAX_UPLOADS = 12;
const uploads: SessionUpload[] = [];

export function addSessionUpload(image: LoadedImage): SessionUpload {
  const upload: SessionUpload = { ...image, id: createId() };
  uploads.unshift(upload);
  if (uploads.length > MAX_UPLOADS) uploads.length = MAX_UPLOADS;
  return upload;
}

export function listSessionUploads(): SessionUpload[] {
  return [...uploads];
}

export function getSessionUpload(id: string): SessionUpload | undefined {
  return uploads.find((u) => u.id === id);
}
