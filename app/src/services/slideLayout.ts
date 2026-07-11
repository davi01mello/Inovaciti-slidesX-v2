import type { RichText } from '@/lib/richText';
import type { GeneratedBlock } from '@/types/generated';
import type { Block, BlockRect, SlideLayout } from '@/types/slide';

/**
 * Motor de layout do CITi Slides — determinístico, nunca decidido pela IA.
 *
 * Antes cada tipo de bloco tinha UM retângulo fixo por layout, então dois blocos
 * do miolo (ex. body + bullets) caíam no MESMO y e ficavam um em cima do outro.
 * Agora o slide é montado em FLUXO: cada bloco recebe uma altura natural (estimada
 * pelo tipo e pelo tamanho do conteúdo) e os blocos são empilhados na ordem em que
 * o agente escreveu, com respiro entre eles. Nada se sobrepõe, nunca.
 *
 * O fluxo também dá variação visual de graça:
 * - Slides de afirmação (sem bullets, poucos blocos) são centralizados no palco,
 *   como uma frase no meio do slide.
 * - Capa, seção e encerramento centralizam a pilha inteira.
 * - Slides de conteúdo clássicos ancoram no topo, com respiro após o título.
 */

const MARGIN_X = 0.06;
const CONTENT_WIDTH = 0.88;
/** Afirmações centrais respiram mais nas laterais. */
const STATEMENT_X = 0.13;
const STATEMENT_WIDTH = 0.74;
const GAP = 0.035;
/** Respiro extra depois do grupo de título num slide de conteúdo. */
const TITLE_EXTRA_GAP = 0.02;

/**
 * Como um bloco de bullets se apresenta visualmente. Espelha o que a geração de
 * imagem final faz (api/src/images/imagePrompt.ts, contentRole): 2 a 3 itens viram
 * cards lado a lado, 4+ viram linhas numeradas, 1 vira lista simples.
 */
export type BulletsPresentation = 'cards' | 'rows' | 'list';

export function bulletsPresentation(itemCount: number): BulletsPresentation {
  if (itemCount >= 4) return 'rows';
  if (itemCount >= 2) return 'cards';
  return 'list';
}

interface FlowInfo {
  kind: Block['kind'];
  chars: number;
  items: number;
}

function richLength(rich: RichText): number {
  return rich.map((run) => run.text).join('').length;
}

function infoOf(block: GeneratedBlock): FlowInfo {
  if (block.kind === 'bullets') {
    const chars = block.items.reduce((max, item) => Math.max(max, richLength(item)), 0);
    return { kind: 'bullets', chars, items: block.items.length };
  }
  return { kind: block.kind, chars: richLength(block.content), items: 0 };
}

/** Altura natural (fração do slide) que cada bloco pede, sensível ao conteúdo real. */
function naturalHeight(info: FlowInfo, layout: SlideLayout): number {
  switch (info.kind) {
    case 'section-label':
      return 0.06;
    case 'title-1': {
      const base = layout === 'content' ? 0.18 : 0.28;
      return info.chars > 34 ? base + 0.08 : base;
    }
    case 'title-2':
      return info.chars > 48 ? 0.2 : 0.13;
    case 'title-3':
      return 0.09;
    case 'subtitle':
      return info.chars > 100 ? 0.14 : 0.09;
    case 'body':
      return Math.min(0.12 + Math.ceil(info.chars / 110) * 0.05, 0.4);
    case 'highlight':
      return info.chars > 120 ? 0.26 : 0.17;
    case 'bullets': {
      const presentation = bulletsPresentation(info.items);
      if (presentation === 'cards') return info.chars > 60 ? 0.4 : 0.34;
      if (presentation === 'rows') return Math.min(0.04 + info.items * 0.115, 0.62);
      return 0.14;
    }
  }
}

function isTitleGroupKind(kind: Block['kind']): boolean {
  return kind === 'section-label' || kind === 'title-1' || kind === 'title-2' || kind === 'subtitle';
}

/**
 * Um slide de conteúdo sem bullets e com poucos blocos é uma "afirmação central":
 * a frase vive no meio do slide, não colada no topo. É um dos formatos que dão
 * variedade ao deck (o mesmo critério do gerador de imagem final).
 */
export function isStatementComposition(layout: SlideLayout, blocks: { kind: Block['kind'] }[]): boolean {
  if (layout !== 'content') return false;
  if (blocks.some((b) => b.kind === 'bullets')) return false;
  return blocks.length <= 3;
}

/**
 * Calcula os retângulos de TODOS os blocos de um slide de uma vez, em fluxo.
 * A ordem dos rects devolvidos casa com a ordem dos blocos recebidos.
 */
export function layoutGeneratedBlocks(layout: SlideLayout, blocks: GeneratedBlock[]): BlockRect[] {
  if (blocks.length === 0) return [];
  const infos = blocks.map(infoOf);
  const statement = isStatementComposition(layout, infos);
  const centeredStack = layout !== 'content' || statement;

  let gap = GAP;
  let heights = infos.map((info) => naturalHeight(info, layout));
  const available = centeredStack ? 0.78 : 0.84;

  const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);
  let total = sum(heights) + gap * (infos.length - 1);

  // Slide cheio demais: primeiro aperta o respiro, depois escala as alturas.
  // (Os rects hoje só existem por compatibilidade de storage — a composição
  // no template posiciona pelo manifesto, ver services/templateManifest.ts.)
  if (total > available) {
    gap = 0.02;
    total = sum(heights) + gap * (infos.length - 1);
    if (total > available) {
      const factor = (available - gap * (infos.length - 1)) / sum(heights);
      heights = heights.map((h) => h * factor);
      total = available;
    }
  }

  let y = centeredStack ? Math.max(0.1, (1 - total) / 2) : 0.1;
  if (layout === 'cover') y = Math.max(0.24, y);

  const x = statement ? STATEMENT_X : MARGIN_X;
  const width = statement ? STATEMENT_WIDTH : CONTENT_WIDTH;

  return infos.map((info, index) => {
    const height = heights[index] ?? 0.1;
    const rect: BlockRect = { x, y, width, height };
    const nextIsBody = index + 1 < infos.length && !isTitleGroupKind(infos[index + 1]?.kind ?? 'body');
    const extra = !centeredStack && isTitleGroupKind(info.kind) && nextIsBody ? TITLE_EXTRA_GAP : 0;
    y += height + gap + extra;
    return rect;
  });
}

