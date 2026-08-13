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
// A Canva processa o pptx (design import) de forma assíncrona do lado dela, e um
// deck com muitos slides/artes pesadas pode legitimamente levar minutos -- 90s
// matava a espera bem antes disso, e a pessoa via timeout, clicava de novo, e o
// reinício (rasterizar + subir tudo de novo) é o que fazia o total percebido
// passar de 10 minutos. Teto maior dá à mesma tentativa a chance de terminar
// sozinha em vez de forçar reinícios que se acumulam.
const MAX_POLL_MS = 8 * 60_000;

/** Em qual etapa a exportação está -- usado pra dar feedback real, não um spinner cego. */
export type CanvaExportStage = 'rendering' | 'uploading' | 'processing';

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
 *
 * `onStage` avisa em qual das três etapas está: renderizar (pesado com muitos
 * slides/fundos animados), enviar (upload do pptx montado) e processar (a Canva
 * importa o arquivo do lado dela -- a etapa mais fora do nosso controle).
 */
export async function exportPresentationToCanva(
  presentation: Presentation,
  onStage?: (stage: CanvaExportStage) => void,
): Promise<string> {
  onStage?.('rendering');
  const pptxBlob = await buildPptxBlob(presentation);

  onStage?.('uploading');
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
  if (data.jobId) {
    onStage?.('processing');
    return pollStatus(presentation.id, data.jobId);
  }
  throw new AiClientError('Não consegui exportar pra Canva agora. Tenta de novo em instantes.', 'server');
}
