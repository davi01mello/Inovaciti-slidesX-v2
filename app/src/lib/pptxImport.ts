/**
 * Importa um .pptx de fora pra dentro do editor — o inverso de exportPptx.ts.
 *
 * Estratégia "fundo + texto solto" (ver conversa com o usuário): cada slide do
 * arquivo original vira uma composição em DUAS camadas, sem tentar encaixar o
 * conteúdo nos nossos arquétipos (título/tópicos/cards etc.):
 *   1. FUNDO: a imagem/cor de fundo e as fotos/logos do slide viram Decorations
 *      full-bleed ou posicionadas — a primeira da lista é sempre o fundo, o
 *      resto pinta por cima (ver DecorationsLayer, a ordem do array é a ordem
 *      de pintura).
 *   2. TEXTO: cada caixa de texto do slide vira um TextBlock flutuante
 *      (floating: true) — o mesmo mecanismo das caixas "estilo Canva" que o
 *      editor já tem (ver FloatingTextLayer).
 *
 * A PEGADINHA do formato: em decks com identidade visual (like a maioria dos
 * decks corporativos "de verdade"), o FUNDO e a LOGO quase nunca estão no XML
 * do slide — eles vivem no slideLayout ou no slideMaster, e o slide herda
 * visualmente sem repetir nada no próprio arquivo. Um slide que parece "só
 * texto" no XML pode estar cheio de arte por herança. Por isso toda extração
 * de fundo/imagem sobe a cadeia slide -> layout -> master até achar algo, e as
 * fotos de fundo/logo do layout e do master também viram Decoration em cada
 * slide (repetidas por slide de propósito — é assim que elas aparecem na
 * apresentação original, e essa camada não tem um "asset compartilhado").
 * Título/corpo sem <a:xfrm> próprio (também herdado do layout) usam a posição
 * do placeholder de mesmo tipo no layout, em vez de uma posição chutada.
 *
 * Roda inteiro no navegador (JSZip + DOMParser), sem tocar no backend — o
 * mesmo espírito de exportPptx.ts, só que ao contrário.
 *
 * A OUTRA PEGADINHA (mais comum em decks exportados de Figma/Canva/Illustrator
 * do que de PowerPoint "manual"): nem toda imagem é um <p:pic>. É bem comum
 * que fundo/logo/arte venham como <p:sp> — uma forma com geometria própria
 * (<a:custGeom>) cujo PREENCHIMENTO é uma imagem (<a:blipFill> dentro de
 * <p:spPr>, em vez do <a:blip> direto de <p:pic>). Pra quem só procura
 * <p:pic>, esses slides parecem "só texto" mesmo estando cheios de arte —
 * por isso toda extração de imagem trata <p:sp> com blipFill exatamente como
 * um <p:pic> (ver shapeHasImageFill).
 *
 * LIMITAÇÕES CONHECIDAS (aceitas de propósito, pra manter isso construível):
 * - Tabelas, gráficos e SmartArt (<p:graphicFrame>) não são lidos.
 * - Formas agrupadas (<p:grpSp>) não são abertas.
 * - Imagens em formato vetorial do Office (EMF/WMF) não são suportadas pelo
 *   <img> do navegador e são puladas.
 * - Fundo por gradiente/textura de tema (sem cor sólida nem imagem explícita
 *   em nenhum nível da cadeia) cai no branco padrão.
 * - Casamento de placeholder herdado é por TIPO (title/body/...), não por
 *   posição exata do idx — em layouts com dois placeholders do mesmo tipo,
 *   pode pegar a posição errada.
 */
import JSZip from 'jszip';
import { createId } from '@/lib/id';
import { fromPlain } from '@/lib/richText';
import { clampRect } from '@/lib/rect';
import { fileToSlideImage } from '@/lib/imageFile';
import type { BlockRect, Decoration, Slide, TextBlock } from '@/types/slide';

export interface PptxImportResult {
  title: string;
  slides: Slide[];
  /** Slides do arquivo original que não puderam ser lidos (XML inesperado) — contados, não travam o resto. */
  skippedSlides: number;
}

const DEFAULT_SLIDE_W_EMU = 12192000;
const DEFAULT_SLIDE_H_EMU = 6858000;

const RASTER_MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

function extOf(path: string): string {
  return (path.split('.').pop() ?? '').toLowerCase();
}

function dirOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/'));
}

function fileOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml');
}

async function readXml(zip: JSZip, path: string): Promise<Document | null> {
  const entry = zip.file(path);
  if (!entry) return null;
  const text = await entry.async('text');
  const doc = parseXml(text);
  if (doc.getElementsByTagName('parsererror').length > 0) return null;
  return doc;
}

/** Resolve um caminho relativo (com ../) contra um diretório base dentro do zip. */
function resolveZipPath(baseDir: string, relative: string): string {
  const baseParts = baseDir.split('/').filter(Boolean);
  const relParts = relative.split('/').filter(Boolean);
  for (const part of relParts) {
    if (part === '..') baseParts.pop();
    else if (part !== '.') baseParts.push(part);
  }
  return baseParts.join('/');
}

/** Lê um .rels e devolve rId -> caminho absoluto no zip (pra resolver r:embed). */
function parseRelsMap(relsDoc: Document | null, baseDir: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!relsDoc) return map;
  Array.from(relsDoc.getElementsByTagName('Relationship')).forEach((rel) => {
    const id = rel.getAttribute('Id');
    const target = rel.getAttribute('Target');
    if (!id || !target) return;
    if (/^https?:\/\//.test(target)) return; // link externo, não é um arquivo do zip
    map.set(id, target.startsWith('/') ? target.slice(1) : resolveZipPath(baseDir, target));
  });
  return map;
}

/** Acha o Target de UMA relação por tipo (ex: ".../slideLayout") — é assim que se sobe de slide pra layout pra master. */
function findRelTargetByType(relsDoc: Document | null, baseDir: string, typeSuffix: string): string | null {
  if (!relsDoc) return null;
  const rel = Array.from(relsDoc.getElementsByTagName('Relationship')).find((r) =>
    (r.getAttribute('Type') ?? '').endsWith(typeSuffix),
  );
  const target = rel?.getAttribute('Target');
  if (!target) return null;
  return target.startsWith('/') ? target.slice(1) : resolveZipPath(baseDir, target);
}

/** Um nível da cadeia slide/layout/master: o XML dele + o mapa de relações PRÓPRIO (r:embed é sempre local ao arquivo). */
interface DocLevel {
  doc: Document;
  relsDoc: Document | null;
  relsMap: Map<string, string>;
  dir: string;
}

async function loadLevel(zip: JSZip, path: string): Promise<DocLevel | null> {
  const doc = await readXml(zip, path);
  if (!doc) return null;
  const dir = dirOf(path);
  const relsDoc = await readXml(zip, `${dir}/_rels/${fileOf(path)}.rels`);
  return { doc, relsDoc, relsMap: parseRelsMap(relsDoc, dir), dir };
}

/**
 * Lê o <a:xfrm> em frações 0..1 da lâmina — SEM clampar. Arte decorativa
 * (fundos, blobs, formas com blipFill) costuma sangrar de propósito pra fora
 * da lâmina; forçar x/width pra dentro de [0,1] espremeria/deslocaria essas
 * peças. Quem precisa do texto sempre visível (caixas de texto) clampa no
 * próprio call site — ver o loop principal de parseSlide.
 */
function emuRect(spPr: Element | null, slideWEmu: number, slideHEmu: number): BlockRect | null {
  const xfrm = spPr?.getElementsByTagName('a:xfrm')[0];
  const off = xfrm?.getElementsByTagName('a:off')[0];
  const ext = xfrm?.getElementsByTagName('a:ext')[0];
  if (!off || !ext) return null;
  const x = Number(off.getAttribute('x'));
  const y = Number(off.getAttribute('y'));
  const cx = Number(ext.getAttribute('cx'));
  const cy = Number(ext.getAttribute('cy'));
  if (![x, y, cx, cy].every((n) => Number.isFinite(n))) return null;
  return { x: x / slideWEmu, y: y / slideHEmu, width: cx / slideWEmu, height: cy / slideHEmu };
}

function extractText(txBody: Element): string {
  const paragraphs = Array.from(txBody.getElementsByTagName('a:p'));
  const lines = paragraphs.map((p) =>
    Array.from(p.getElementsByTagName('a:t'))
      .map((t) => t.textContent ?? '')
      .join(''),
  );
  return lines.join('\n').trim();
}

/** 1x1px sólido como data URL — fallback de fundo quando nada na cadeia slide/layout/master informa cor ou imagem. */
function solidColorDataUrl(hex: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = `#${hex}`;
  ctx.fillRect(0, 0, 1, 1);
  return canvas.toDataURL('image/png');
}

async function mediaToDataUrl(zip: JSZip, mediaPath: string, label: string): Promise<string | null> {
  const mime = RASTER_MIME_BY_EXT[extOf(mediaPath)];
  if (!mime) return null; // EMF/WMF/TIFF/SVG — o <img> do navegador não desenha, pula
  const entry = zip.file(mediaPath);
  if (!entry) return null;
  try {
    const blob = await entry.async('blob');
    const file = new File([blob], label, { type: mime });
    const loaded = await fileToSlideImage(file);
    return loaded.dataUrl;
  } catch {
    return null;
  }
}

interface ExtractedPicture {
  rect: BlockRect;
  dataUrl: string;
}

async function extractPicture(
  zip: JSZip,
  pic: Element,
  relsMap: Map<string, string>,
  slideWEmu: number,
  slideHEmu: number,
): Promise<ExtractedPicture | null> {
  const rId = pic.getElementsByTagName('a:blip')[0]?.getAttribute('r:embed');
  const mediaPath = rId ? relsMap.get(rId) : undefined;
  if (!mediaPath) return null;

  const dataUrl = await mediaToDataUrl(zip, mediaPath, mediaPath.split('/').pop() ?? 'imagem');
  if (!dataUrl) return null;

  const spPr = pic.getElementsByTagName('p:spPr')[0] ?? null;
  const rect = emuRect(spPr, slideWEmu, slideHEmu) ?? clampRect({ x: 0.35, y: 0.35, width: 0.3, height: 0.3 });
  return { rect, dataUrl };
}

/** O <p:bgPr> deste nível (slide, layout OU master) — null quando o nível simplesmente não define fundo próprio. */
async function levelBackground(zip: JSZip, level: DocLevel): Promise<string | null> {
  const bgPr = level.doc.getElementsByTagName('p:bgPr')[0];
  if (!bgPr) return null;
  const rId = bgPr.getElementsByTagName('a:blip')[0]?.getAttribute('r:embed');
  const mediaPath = rId ? level.relsMap.get(rId) : undefined;
  if (mediaPath) {
    const dataUrl = await mediaToDataUrl(zip, mediaPath, 'fundo');
    if (dataUrl) return dataUrl;
  }
  const hex = bgPr.getElementsByTagName('a:srgbClr')[0]?.getAttribute('val');
  if (hex) return solidColorDataUrl(hex);
  return null; // <p:bgPr> existe mas é gradiente/textura de tema — sobe pro próximo nível
}

/** Sobe slide -> layout -> master até achar um fundo; branco se ninguém souber. */
async function resolveBackground(
  zip: JSZip,
  slideLevel: DocLevel,
  layoutLevel: DocLevel | null,
  masterLevel: DocLevel | null,
): Promise<string> {
  const fromSlide = await levelBackground(zip, slideLevel);
  if (fromSlide) return fromSlide;
  if (layoutLevel) {
    const fromLayout = await levelBackground(zip, layoutLevel);
    if (fromLayout) return fromLayout;
  }
  if (masterLevel) {
    const fromMaster = await levelBackground(zip, masterLevel);
    if (fromMaster) return fromMaster;
  }
  return solidColorDataUrl('FFFFFF');
}

/** As <p:pic> (e <p:sp> com blipFill — ver shapeHasImageFill) filhas diretas da spTree deste nível. */
function levelPictures(level: DocLevel): Element[] {
  const spTree = level.doc.getElementsByTagName('p:spTree')[0];
  if (!spTree) return [];
  return Array.from(spTree.children).filter(
    (c) => c.tagName === 'p:pic' || (c.tagName === 'p:sp' && shapeHasImageFill(c)),
  );
}

/** Tipo do placeholder ("title", "body", "subTitle"...) — sem <p:ph>, não é um placeholder herdável. */
function placeholderType(sp: Element): string | null {
  const ph = sp.getElementsByTagName('p:ph')[0];
  if (!ph) return null;
  return ph.getAttribute('type') ?? 'body';
}

/** Posição do placeholder de mesmo TIPO no layout — é de onde título/corpo herdam posição quando o slide não a repete. */
function layoutPlaceholderRect(layoutLevel: DocLevel | null, type: string, slideWEmu: number, slideHEmu: number): BlockRect | null {
  if (!layoutLevel) return null;
  const spTree = layoutLevel.doc.getElementsByTagName('p:spTree')[0];
  if (!spTree) return null;
  for (const sp of Array.from(spTree.children)) {
    if (sp.tagName !== 'p:sp' || placeholderType(sp) !== type) continue;
    const rect = emuRect(sp.getElementsByTagName('p:spPr')[0] ?? null, slideWEmu, slideHEmu);
    if (rect) return clampRect(rect);
  }
  return null;
}

/**
 * True quando uma <p:sp> é, na prática, uma imagem: geometria própria
 * (ou preset) preenchida com <a:blipFill> em vez de cor/gradiente. Muito
 * comum em decks exportados de Figma/Canva — toda arte (fundo, logo,
 * ícone) sai como forma-com-preenchimento-de-imagem, não como <p:pic>.
 * Sem checar isso, esses slides "perdem" 100% das imagens no import.
 */
function shapeHasImageFill(sp: Element): boolean {
  const spPr = sp.getElementsByTagName('p:spPr')[0];
  if (!spPr) return false;
  return Array.from(spPr.children).some((c) => c.tagName === 'a:blipFill');
}

async function parseSlide(zip: JSZip, slidePath: string, slideWEmu: number, slideHEmu: number): Promise<Slide | null> {
  const slideLevel = await loadLevel(zip, slidePath);
  if (!slideLevel) return null;

  const layoutPath = findRelTargetByType(slideLevel.relsDoc, slideLevel.dir, '/slideLayout');
  const layoutLevel = layoutPath ? await loadLevel(zip, layoutPath) : null;
  const masterPath = layoutLevel ? findRelTargetByType(layoutLevel.relsDoc, layoutLevel.dir, '/slideMaster') : null;
  const masterLevel = masterPath ? await loadLevel(zip, masterPath) : null;

  const decorations: Decoration[] = [
    // O fundo entra PRIMEIRO: fica embaixo de tudo (a ordem do array é a ordem
    // de pintura das decorações — ver DecorationsLayer).
    {
      id: createId(),
      assetKey: 'upload',
      src: await resolveBackground(zip, slideLevel, layoutLevel, masterLevel),
      rect: { x: 0, y: 0, width: 1, height: 1 },
    },
  ];
  const blocks: TextBlock[] = [];

  // Fotos/logos do MASTER primeiro, depois do LAYOUT, depois do slide — reflete a
  // ordem real de empilhamento visual (o master é o alicerce, o slide é o topo).
  for (const level of [masterLevel, layoutLevel].filter((l): l is DocLevel => l !== null)) {
    for (const pic of levelPictures(level)) {
      const extracted = await extractPicture(zip, pic, level.relsMap, slideWEmu, slideHEmu);
      if (extracted) decorations.push({ id: createId(), assetKey: 'upload', src: extracted.dataUrl, rect: extracted.rect });
    }
  }

  const spTree = slideLevel.doc.getElementsByTagName('p:spTree')[0];
  const children = spTree ? Array.from(spTree.children) : [];

  let textCount = 0;
  for (const child of children) {
    const isImageShape = child.tagName === 'p:sp' && shapeHasImageFill(child);
    if (child.tagName === 'p:pic' || isImageShape) {
      const extracted = await extractPicture(zip, child, slideLevel.relsMap, slideWEmu, slideHEmu);
      if (extracted) decorations.push({ id: createId(), assetKey: 'upload', src: extracted.dataUrl, rect: extracted.rect });
    }
    if (child.tagName === 'p:sp' && !isImageShape) {
      const txBody = child.getElementsByTagName('p:txBody')[0];
      const text = txBody ? extractText(txBody) : '';
      if (text.length === 0) continue;

      const spPr = child.getElementsByTagName('p:spPr')[0] ?? null;
      const ownRect = emuRect(spPr, slideWEmu, slideHEmu);
      // Sem <a:xfrm> próprio (comum: placeholder herdado do layout) — usa a
      // posição do placeholder de mesmo tipo no layout antes de chutar.
      const type = placeholderType(child);
      const inheritedRect = ownRect ? null : type ? layoutPlaceholderRect(layoutLevel, type, slideWEmu, slideHEmu) : null;
      const fallback = clampRect({ x: 0.12, y: 0.14 + textCount * 0.16, width: 0.76, height: 0.14 });
      const rect = ownRect ?? inheritedRect ?? fallback;
      textCount += 1;

      blocks.push({
        id: createId(),
        kind: 'body',
        align: 'left',
        content: fromPlain(text),
        rect: clampRect(rect),
        floating: true,
      });
    }
    // <p:graphicFrame> (tabela/gráfico/SmartArt) e <p:grpSp> (grupo) ficam de
    // fora de propósito — ver limitações no comentário do topo do arquivo.
  }

  return { id: createId(), layout: 'content', blocks, decorations };
}

/** Lê o rId de cada <p:sldId> na ordem do <p:sldIdLst> — é a ordem real da apresentação. */
function resolveSlideOrder(presDoc: Document, relsMap: Map<string, string>): string[] {
  return Array.from(presDoc.getElementsByTagName('p:sldId'))
    .map((el) => el.getAttribute('r:id'))
    .filter((id): id is string => !!id)
    .map((id) => relsMap.get(id))
    .filter((p): p is string => !!p);
}

/** Fallback se a ordem via presentation.xml falhar: sort numérico dos nomes de arquivo. */
function slidePathsByFilename(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => {
      const na = Number(/slide(\d+)\.xml$/.exec(a)?.[1] ?? 0);
      const nb = Number(/slide(\d+)\.xml$/.exec(b)?.[1] ?? 0);
      return na - nb;
    });
}

export async function parsePptxFile(file: File): Promise<PptxImportResult> {
  if (!/\.pptx$/i.test(file.name)) {
    throw new Error('Esse arquivo não é um .pptx.');
  }

  const zip = await JSZip.loadAsync(file);

  const presDoc = await readXml(zip, 'ppt/presentation.xml');
  if (!presDoc) {
    throw new Error('Não consegui ler esse arquivo — parece que não é um .pptx válido.');
  }

  const sldSz = presDoc.getElementsByTagName('p:sldSz')[0];
  const slideWEmu = Number(sldSz?.getAttribute('cx')) || DEFAULT_SLIDE_W_EMU;
  const slideHEmu = Number(sldSz?.getAttribute('cy')) || DEFAULT_SLIDE_H_EMU;

  const presRelsDoc = await readXml(zip, 'ppt/_rels/presentation.xml.rels');
  const presRelsMap = parseRelsMap(presRelsDoc, 'ppt');

  let slidePaths = resolveSlideOrder(presDoc, presRelsMap);
  if (slidePaths.length === 0) slidePaths = slidePathsByFilename(zip);
  if (slidePaths.length === 0) {
    throw new Error('Esse .pptx não tem nenhum slide legível.');
  }

  const coreDoc = await readXml(zip, 'docProps/core.xml');
  const rawTitle = coreDoc?.getElementsByTagName('dc:title')[0]?.textContent?.trim();
  const title = rawTitle && rawTitle.length > 0 ? rawTitle : file.name.replace(/\.pptx$/i, '');

  const slides: Slide[] = [];
  let skippedSlides = 0;
  for (const slidePath of slidePaths) {
    const slide = await parseSlide(zip, slidePath, slideWEmu, slideHEmu);
    if (slide) slides.push(slide);
    else skippedSlides += 1;
  }

  if (slides.length === 0) {
    throw new Error('Não consegui importar nenhum slide desse arquivo.');
  }

  return { title, slides, skippedSlides };
}
