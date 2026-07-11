import PptxGenJS from 'pptxgenjs';
import { renderSlidesToPngs } from '@/lib/slideRaster';
import type { Presentation } from '@/types/presentation';

/** Widescreen padrão do PowerPoint (13.333 x 7.5 in), 16:9 exato. */
const SLIDE_WIDTH_IN = 13.333;
const SLIDE_HEIGHT_IN = 7.5;

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

async function buildPptx(presentation: Presentation): Promise<PptxGenJS> {
  if (presentation.slides.length === 0) {
    throw new Error('Essa apresentação não tem slides.');
  }

  // Rasteriza a composição (template + textos) direto no navegador.
  const images = await renderSlidesToPngs(presentation.slides);

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'CITI_WIDE', width: SLIDE_WIDTH_IN, height: SLIDE_HEIGHT_IN });
  pptx.layout = 'CITI_WIDE';

  for (const data of images) {
    const pptxSlide = pptx.addSlide();
    pptxSlide.addImage({
      data,
      x: 0,
      y: 0,
      w: SLIDE_WIDTH_IN,
      h: SLIDE_HEIGHT_IN,
      sizing: { type: 'cover', w: SLIDE_WIDTH_IN, h: SLIDE_HEIGHT_IN },
    });
  }
  return pptx;
}

/** Monta um .pptx com uma imagem composta por slide e baixa no navegador. */
export async function exportPresentationAsPptx(presentation: Presentation): Promise<void> {
  const pptx = await buildPptx(presentation);
  await pptx.writeFile({ fileName: slugifyFilename(presentation.title) });
}

/** O mesmo .pptx do download, como Blob — é o arquivo que vai pro import da Canva. */
export async function buildPptxBlob(presentation: Presentation): Promise<Blob> {
  const pptx = await buildPptx(presentation);
  return (await pptx.write({ outputType: 'blob' })) as Blob;
}
