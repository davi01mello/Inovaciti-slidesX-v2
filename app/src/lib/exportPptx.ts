import PptxGenJS from 'pptxgenjs';
import { renderSlidesForExport, RASTER_WIDTH, type ExportText } from '@/lib/slideRaster';
import type { Presentation } from '@/types/presentation';

/** Widescreen padrão do PowerPoint (13.333 x 7.5 in), 16:9 exato. */
const SLIDE_WIDTH_IN = 13.333;
const SLIDE_HEIGHT_IN = 7.5;

/** Palco de 1920px = 13.333in → 144px por polegada; 1pt = 2px nessa densidade. */
const PX_PER_INCH = RASTER_WIDTH / SLIDE_WIDTH_IN;
const PX_PER_POINT = 2;

/** Verde CITi dos trechos com highlight (o mesmo --color-slide-hl do render). */
const HIGHLIGHT_HEX = '09E880';

/** A fonte dos slides. Quem não tiver a Sora instalada vê a substituta do sistema. */
const SLIDE_FONT = 'Sora';

function slugifyFilename(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '') // caracteres inválidos em nome de arquivo no Windows
    .replace(/\s+/g, ' ')
    .trim();
  return `${cleaned || 'apresentacao'}.pptx`;
}

/** True quando a apresentação tem o que exportar (a composição sempre está pronta). */
export function canExportPresentation(presentation: Presentation): boolean {
  return presentation.slides.length > 0;
}

/** Converte um texto medido no palco em runs + opções do pptxgenjs. */
function toPptxText(text: ExportText): { runs: PptxGenJS.TextProps[]; options: PptxGenJS.TextPropsOptions } {
  const runs: PptxGenJS.TextProps[] = [];
  for (const run of text.runs) {
    // '\n' dentro de um run vira quebra de linha real (breakLine por segmento).
    const parts = run.text.split('\n');
    parts.forEach((part, i) => {
      runs.push({
        text: part,
        options: {
          bold: text.bold || !!run.bold,
          color: run.highlight ? HIGHLIGHT_HEX : (run.colorHex ?? text.color),
          fontFace: run.fontFace ?? SLIDE_FONT,
          ...(run.fontSizePx ? { fontSize: run.fontSizePx / PX_PER_POINT } : {}),
          breakLine: i < parts.length - 1,
        },
      });
    });
  }

  const options: PptxGenJS.TextPropsOptions = {
    x: text.x / PX_PER_INCH,
    y: text.y / PX_PER_INCH,
    // Folga mínima de largura: se a máquina não tiver a Sora, a substituta pode
    // medir um fio mais larga — a folga evita uma quebra de linha extra.
    w: Math.min((text.w + 6) / PX_PER_INCH, SLIDE_WIDTH_IN - text.x / PX_PER_INCH),
    h: Math.max(text.h / PX_PER_INCH, 0.2),
    fontFace: SLIDE_FONT,
    fontSize: text.fontSizePx / PX_PER_POINT,
    color: text.color,
    align: text.align,
    valign: 'top',
    margin: 0,
    lineSpacing: text.lineSpacingPx / PX_PER_POINT,
    ...(text.charSpacingPx > 0 ? { charSpacing: text.charSpacingPx / PX_PER_POINT } : {}),
  };

  return { runs, options };
}

async function buildPptx(presentation: Presentation): Promise<PptxGenJS> {
  if (presentation.slides.length === 0) {
    throw new Error('Essa apresentação não tem slides.');
  }

  // Duas camadas por slide: a ARTE rasterizada (fundo, molduras, logo) e os
  // TEXTOS medidos do mesmo palco — que entram como caixas de texto reais,
  // editáveis no PowerPoint e na Canva.
  const exports = await renderSlidesForExport(presentation);

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'CITI_WIDE', width: SLIDE_WIDTH_IN, height: SLIDE_HEIGHT_IN });
  pptx.layout = 'CITI_WIDE';

  for (const slideExport of exports) {
    const pptxSlide = pptx.addSlide();
    pptxSlide.addImage({
      data: slideExport.background,
      x: 0,
      y: 0,
      w: SLIDE_WIDTH_IN,
      h: SLIDE_HEIGHT_IN,
    });
    for (const text of slideExport.texts) {
      const { runs, options } = toPptxText(text);
      pptxSlide.addText(runs, options);
    }
  }
  return pptx;
}

/** Monta um .pptx com arte + textos reais por slide e baixa no navegador. */
export async function exportPresentationAsPptx(presentation: Presentation): Promise<void> {
  const pptx = await buildPptx(presentation);
  await pptx.writeFile({ fileName: slugifyFilename(presentation.title) });
}

/** O mesmo .pptx do download, como Blob — é o arquivo que vai pro import da Canva. */
export async function buildPptxBlob(presentation: Presentation): Promise<Blob> {
  const pptx = await buildPptx(presentation);
  return (await pptx.write({ outputType: 'blob' })) as Blob;
}
