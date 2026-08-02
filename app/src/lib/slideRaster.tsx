import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import { SlideComposition } from '@/components/present/SlideComposition';
import { fromDom, FONT_FAMILY_OPTIONS, FONT_SIZE_SCALE } from '@/lib/richText';
import { planForPresentation } from '@/services/deckPlan';
import { elementByKey } from '@/services/elementsManifest';
import { iconByKey } from '@/services/iconsManifest';
import { companyLogoByKey } from '@/services/companyLogosManifest';
import type { Presentation } from '@/types/presentation';
import type { Decoration } from '@/types/slide';

/**
 * Prepara os slides compostos pro export, direto no navegador — em DUAS camadas:
 *
 * 1. A ARTE: o slide é rasterizado em PNG com os textos escondidos
 *    (data-slide-export='art' + regra CSS em index.css). Fundo, molduras de card,
 *    números, ícones e logo viram a imagem de fundo do slide exportado.
 * 2. OS TEXTOS: cada texto da composição ([data-export-text]) é MEDIDO no palco
 *    de 1920x1080 (posição, tamanho efetivo de fonte já com as escalas de
 *    FitText/LineFit aplicadas, cor, alinhamento) e emitido como caixa de TEXTO
 *    REAL no PPTX — editável no PowerPoint, no Keynote e na Canva.
 *
 * É o que garante fidelidade visual total sem transformar o texto em pixel.
 */

export const RASTER_WIDTH = 1920;
export const RASTER_HEIGHT = 1080;

export interface ExportTextRun {
  text: string;
  bold?: boolean;
  /** Verde CITi nos trechos com highlight; ausente = cor base do texto. */
  highlight?: boolean;
  /** Override de cor do run (hex sem '#'), quando fora da paleta padrão do bloco. */
  colorHex?: string;
  /** Nome da fonte do run, quando diferente da fonte padrão do slide. */
  fontFace?: string;
  /** Tamanho do run em px, já resolvido pela escala relativa do run. */
  fontSizePx?: number;
}

export interface ExportText {
  /** Retângulo em px no palco 1920x1080. */
  x: number;
  y: number;
  w: number;
  h: number;
  runs: ExportTextRun[];
  /** Tamanho efetivo em px (fonte computada × escala acumulada de FitText/LineFit). */
  fontSizePx: number;
  bold: boolean;
  /** Cor base (hex sem '#'). */
  color: string;
  align: 'left' | 'center' | 'right' | 'justify';
  lineSpacingPx: number;
  charSpacingPx: number;
}

/** Uma decoração (bolha, ícone de marca ou logo de empresa) pronta pro PPTX. */
export interface ExportDecoration {
  /** Retângulo em px no palco 1920x1080 (não rotacionado — a rotação é campo à parte). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** URL da arte (data: URL de upload, ou caminho resolvido do manifest — ambos carregáveis pelo pptxgenjs). */
  src: string;
  /** Graus, sentido horário. Ausente/0 = sem rotação. */
  rotation: number;
}

export interface SlideExport {
  /** PNG (data URL) da arte sem textos nem decorações. */
  background: string;
  texts: ExportText[];
  decorations: ExportDecoration[];
}

/**
 * Resolve a arte de uma decoração pelo mesmo namespace de assetKey do
 * DecorationsLayer (upload > elemento > ícone > logo de empresa). Lido
 * direto do modelo (slide.decorations), não do DOM: o rect já é a fonte da
 * verdade, e medir via getBoundingClientRect quebraria com rotação (o
 * bounding box de um elemento rotacionado não é mais x/y/w/h/rotation).
 */
function resolveDecorationSrc(decoration: Decoration): string | undefined {
  return (
    decoration.src ??
    elementByKey(decoration.assetKey)?.src ??
    iconByKey(decoration.assetKey)?.src ??
    companyLogoByKey(decoration.assetKey)?.src
  );
}

/** Converte as decorações de UM slide (modelo) nas medidas em px do palco de export. */
function exportDecorationsFor(decorations: Decoration[] | undefined): ExportDecoration[] {
  if (!decorations || decorations.length === 0) return [];
  return decorations
    .map((decoration) => {
      const src = resolveDecorationSrc(decoration);
      if (!src) return null;
      return {
        x: decoration.rect.x * RASTER_WIDTH,
        y: decoration.rect.y * RASTER_HEIGHT,
        w: decoration.rect.width * RASTER_WIDTH,
        h: decoration.rect.height * RASTER_HEIGHT,
        src,
        rotation: decoration.rotation ?? 0,
      };
    })
    .filter((d): d is ExportDecoration => d !== null);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForImages(host: HTMLElement): Promise<void> {
  const images = Array.from(host.querySelectorAll('img'));
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }),
    ),
  );
}

function toHex(color: string): string {
  const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!match) return 'F7F7F7';
  return [match[1], match[2], match[3]]
    .map((n) => Number(n).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/** Hex de exportação para a paleta fixa — sem depender de CSS vars, que o pptx não resolve. */
const EXPORT_COLOR_HEX: Record<'white' | 'gray' | 'green', string> = {
  white: 'F7F7F7',
  gray: 'B3B3B3',
  green: '09E880',
};

function normalizeAlign(value: string): ExportText['align'] {
  if (value === 'center' || value === 'right' || value === 'justify') return value;
  return 'left';
}

/** Extrai as medidas e os runs de um elemento de texto da composição. */
function measureText(el: HTMLElement, stageRect: DOMRect): ExportText | null {
  if ((el.textContent ?? '').trim().length === 0) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const computed = window.getComputedStyle(el);
  // FitText/LineFit aplicam transform: scale() — o rect é transformado, o
  // offsetWidth é o layout puro. A razão entre eles é a escala acumulada.
  const scale = el.offsetWidth > 0 ? rect.width / el.offsetWidth : 1;
  const fontSizePx = parseFloat(computed.fontSize) * scale;

  const lineHeightRaw = computed.lineHeight;
  const lineSpacingPx =
    lineHeightRaw && lineHeightRaw !== 'normal' ? parseFloat(lineHeightRaw) * scale : fontSizePx * 1.35;
  const letterRaw = computed.letterSpacing;
  const charSpacingPx = letterRaw && letterRaw !== 'normal' ? parseFloat(letterRaw) * scale : 0;

  // O DESTAQUE segue a barra de cor (--color-slide-hl = acento do tom, setado no
  // palco). Lê a cor COMPUTADA de um trecho marcado em vez do verde fixo, pra o PPTX
  // sair com o mesmo acento que está na tela. Um trecho basta: todos herdam a mesma var.
  const hlEl = el.querySelector<HTMLElement>('[data-hl="1"], [data-color="green"]');
  const highlightHex = hlEl ? toHex(window.getComputedStyle(hlEl).color) : undefined;

  let runs: ExportTextRun[] = fromDom(el).map((run) => ({
    text: run.text,
    ...(run.bold ? { bold: true } : {}),
    ...(run.highlight ? { highlight: true, ...(highlightHex ? { colorHex: highlightHex } : {}) } : {}),
    ...(run.color && run.color !== 'default'
      ? { colorHex: run.color === 'green' ? (highlightHex ?? EXPORT_COLOR_HEX.green) : EXPORT_COLOR_HEX[run.color] }
      : {}),
    ...(run.fontFamily ? { fontFace: FONT_FAMILY_OPTIONS[run.fontFamily].label } : {}),
    ...(run.size && run.size !== 'md' ? { fontSizePx: fontSizePx * FONT_SIZE_SCALE[run.size].em } : {}),
  }));
  if (computed.textTransform === 'uppercase') {
    runs = runs.map((run) => ({ ...run, text: run.text.toUpperCase() }));
  }
  if (runs.length === 0) return null;

  return {
    x: rect.left - stageRect.left,
    y: rect.top - stageRect.top,
    w: rect.width,
    h: rect.height,
    runs,
    fontSizePx,
    bold: parseInt(computed.fontWeight, 10) >= 600,
    color: toHex(computed.color),
    align: normalizeAlign(computed.textAlign),
    lineSpacingPx,
    charSpacingPx,
  };
}

/**
 * Renderiza cada slide e devolve arte (PNG) + textos medidos, na ordem do deck.
 *
 * Recebe a APRESENTAÇÃO, não os slides soltos, porque a arte de cada slide vem do
 * plano do deck (id + tone + papéis). Rasterizar slide por slide, sem o plano,
 * exportaria artes DIFERENTES das que estão no palco — e o export não pode ser um
 * segundo design, ele é o mesmo pixel em outro arquivo.
 */
export async function renderSlidesForExport(presentation: Presentation): Promise<SlideExport[]> {
  const { tone, art } = planForPresentation(presentation);
  const slides = presentation.slides;
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${RASTER_WIDTH}px;pointer-events:none;`;
  document.body.appendChild(host);

  const roots: ReturnType<typeof createRoot>[] = [];
  const stages: HTMLDivElement[] = [];
  try {
    for (const slide of slides) {
      const stage = document.createElement('div');
      stage.style.cssText = `width:${RASTER_WIDTH}px;height:${RASTER_HEIGHT}px;`;
      host.appendChild(stage);
      const root = createRoot(stage);
      root.render(<SlideComposition slide={slide} tone={tone} art={art.get(slide.id)} />);
      roots.push(root);
      stages.push(stage);
    }

    // Espera React montar, fontes carregarem, as artes decodificarem e os
    // ajustes de FitText/LineFit assentarem — medir antes disso sairia errado.
    await nextFrame();
    await document.fonts.ready;
    await waitForImages(host);
    await nextFrame();
    await nextFrame();

    const results: SlideExport[] = [];
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i]!;
      const stageRect = stage.getBoundingClientRect();
      const texts = Array.from(stage.querySelectorAll<HTMLElement>('[data-export-text]'))
        .map((el) => measureText(el, stageRect))
        .filter((t): t is ExportText => t !== null);
      const decorations = exportDecorationsFor(slides[i]!.decorations);

      // Esconde textos E decorações (mantendo a geometria) e rasteriza só a
      // arte de fundo. O CINTO é a regra CSS (visibility: hidden); a
      // SUSPENSÓRIO é o filter, que REMOVE os nós do clone rasterizado — texto
      // ou decoração duplicados no fundo é exatamente o defeito que motivou
      // essa camada dupla (ver data-export-text e data-export-decoration).
      stage.setAttribute('data-slide-export', 'art');
      const background = await toPng(stage, {
        width: RASTER_WIDTH,
        height: RASTER_HEIGHT,
        pixelRatio: 1,
        backgroundColor: '#040605',
        filter: (node) =>
          !(
            node instanceof HTMLElement &&
            (node.hasAttribute('data-export-text') || node.hasAttribute('data-export-decoration'))
          ),
      });
      results.push({ background, texts, decorations });
    }
    return results;
  } finally {
    roots.forEach((root) => root.unmount());
    host.remove();
  }
}
