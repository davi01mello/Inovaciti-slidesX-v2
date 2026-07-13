import type { FloatingTextKind } from '@/lib/blocks';

/**
 * Contrato do arrastar-e-soltar do dock pro palco: o painel escreve um payload
 * leve no dataTransfer e o palco lê no drop, inserindo EXATAMENTE onde soltou.
 * Imagens viajam por id (ver sessionUploads) — um data URL no payload de arrasto
 * seria pesado demais.
 */

export const INSERT_DND_MIME = 'application/x-citi-insert';

export type InsertPayload =
  | { type: 'text'; kind: FloatingTextKind }
  | { type: 'element'; assetKey: string }
  | { type: 'image'; uploadId: string };

export function writeInsertPayload(dataTransfer: DataTransfer, payload: InsertPayload): void {
  dataTransfer.setData(INSERT_DND_MIME, JSON.stringify(payload));
  dataTransfer.effectAllowed = 'copy';
}

export function readInsertPayload(dataTransfer: DataTransfer): InsertPayload | null {
  const raw = dataTransfer.getData(INSERT_DND_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InsertPayload;
  } catch {
    return null;
  }
}

/** O arrasto atual traz algo que o palco sabe receber (payload do dock ou arquivos)? */
export function isInsertDrag(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(INSERT_DND_MIME) || dataTransfer.types.includes('Files');
}
