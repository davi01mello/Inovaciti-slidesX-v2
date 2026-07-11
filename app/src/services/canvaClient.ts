import { buildPptxBlob } from '@/lib/exportPptx';
import type { Presentation } from '@/types/presentation';
import { AiClientError } from './aiClient';

interface ExportCanvaResponse {
  status: 'success' | 'in_progress';
  editUrl?: string;
  jobId?: string;
}

interface CanvaErrorBody {
  error?: unknown;
}

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_MS = 90_000;

async function readJsonOrThrow<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;

  const data = (await res.json().catch(() => null)) as CanvaErrorBody | null;
  const message = data && typeof data.error === 'string' ? data.error : null;

  if (res.status === 409) {
    // Integração ainda não autorizada -- ver api/README.md (seção Canva).
    throw new AiClientError(
      message || 'A integração com a Canva ainda não foi autorizada nesse servidor.',
      'unavailable',
    );
  }
  throw new AiClientError(message || 'Não consegui exportar pra Canva agora. Tenta de novo em instantes.', 'server');
}

async function pollStatus(presentationId: string, jobId: string): Promise<string> {
  const deadline = Date.now() + MAX_POLL_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const res = await fetch(`/api/presentations/${presentationId}/export-canva/${jobId}/status`);
    const data = await readJsonOrThrow<ExportCanvaResponse>(res);
    if (data.status === 'success' && data.editUrl) return data.editUrl;
  }
  throw new AiClientError('A importação na Canva está demorando demais. Tenta de novo em instantes.', 'timeout');
}

/**
 * Monta o pptx AQUI no navegador (slides compostos no template, rasterizados) e
 * manda o arquivo pronto pra API importar como design editável na Canva.
 * Devolve a edit_url.
 */
export async function exportPresentationToCanva(presentation: Presentation): Promise<string> {
  const pptxBlob = await buildPptxBlob(presentation);
  const res = await fetch(
    `/api/presentations/${presentation.id}/export-canva?title=${encodeURIComponent(presentation.title)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': PPTX_MIME },
      body: pptxBlob,
    },
  );

  const data = await readJsonOrThrow<ExportCanvaResponse>(res);
  if (data.status === 'success' && data.editUrl) return data.editUrl;
  if (data.jobId) return pollStatus(presentation.id, data.jobId);
  throw new AiClientError('Não consegui exportar pra Canva agora. Tenta de novo em instantes.', 'server');
}
