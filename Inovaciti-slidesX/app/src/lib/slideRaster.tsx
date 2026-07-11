import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import { SlideComposition } from '@/components/present/SlideComposition';
import type { Slide } from '@/types/slide';

/**
 * Rasteriza slides compostos no template em PNGs, direto no navegador.
 *
 * Cada slide é montado num palco invisível de 1920x1080 (o SlideComposition usa
 * unidades de container, então a composição sai idêntica à da apresentação) e
 * convertido em PNG via html-to-image. É o que alimenta o export PPTX e o
 * envio pra Canva — sem depender de nenhum serviço de geração de imagem.
 */

export const RASTER_WIDTH = 1920;
export const RASTER_HEIGHT = 1080;

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

/** Renderiza cada slide em PNG (data URL), na ordem recebida. */
export async function renderSlidesToPngs(slides: Slide[]): Promise<string[]> {
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
      root.render(<SlideComposition slide={slide} />);
      roots.push(root);
      stages.push(stage);
    }

    // Espera React montar, fontes carregarem e as artes do template decodificarem —
    // rasterizar antes disso resultaria em slide sem fundo ou com fonte trocada.
    await nextFrame();
    await document.fonts.ready;
    await waitForImages(host);
    await nextFrame();

    const urls: string[] = [];
    for (const stage of stages) {
      urls.push(
        await toPng(stage, {
          width: RASTER_WIDTH,
          height: RASTER_HEIGHT,
          pixelRatio: 1,
          backgroundColor: '#040605',
        }),
      );
    }
    return urls;
  } finally {
    roots.forEach((root) => root.unmount());
    host.remove();
  }
}
