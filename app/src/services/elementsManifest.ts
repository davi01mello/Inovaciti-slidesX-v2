/**
 * Biblioteca de elementos visuais 3D da marca CITi (blobs coloridos) — inseríveis
 * soltos num slide como Decoration (ver types/slide.ts).
 *
 * Zero configuração manual: qualquer imagem colocada em app/src/assets/elements/<cor>/<forma>.<ext>
 * aparece aqui automaticamente via import.meta.glob (build-time, sem fetch em runtime).
 * Convenção de pasta: uma subpasta por variação de cor, um arquivo por forma.
 */

const modules = import.meta.glob('/src/assets/elements/**/*.{png,webp,jpg,jpeg,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export interface ElementAsset {
  /** Chave estável: "<cor>/<forma>" — é o que fica salvo em Decoration.assetKey. */
  key: string;
  color: string;
  shape: string;
  src: string;
}

const COLOR_LABELS: Record<string, string> = {
  azul: 'Azul',
  preto: 'Preto',
  roxo: 'Roxo',
  rosa: 'Rosa',
  verde: 'Verde',
  'gradiente-azul-verde': 'Degradê Azul-Verde',
  'gradiente-roxo-azul-verde': 'Degradê Roxo-Azul-Verde',
};

const SHAPE_LABELS: Record<string, string> = {
  ameba: 'Ameba',
  anelar: 'Anelar',
  c: 'C',
  concha: 'Concha',
  coracao: 'Coração',
  espiral: 'Espiral',
  fenda: 'Fenda',
  parafuso: 'Parafuso',
  patinho: 'Patinho',
};

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length === 0 ? w : w[0]!.toUpperCase() + w.slice(1)))
    .join(' ');
}

function parsePath(path: string): { color: string; shape: string } {
  const match = /\/elements\/([^/]+)\/([^/.]+)\.[a-zA-Z0-9]+$/.exec(path);
  return { color: match?.[1] ?? 'outros', shape: match?.[2] ?? path };
}

export const ELEMENTS: ElementAsset[] = Object.entries(modules)
  .map(([path, src]) => {
    const { color, shape } = parsePath(path);
    return { key: `${color}/${shape}`, color, shape, src };
  })
  .sort((a, b) => a.key.localeCompare(b.key));

/** Cores disponíveis, na ordem em que aparecem nos elementos (estável e sem duplicatas). */
export const ELEMENT_COLORS: string[] = Array.from(new Set(ELEMENTS.map((e) => e.color)));

export function elementColorLabel(color: string): string {
  return COLOR_LABELS[color] ?? titleCase(color);
}

export function elementShapeLabel(shape: string): string {
  return SHAPE_LABELS[shape] ?? titleCase(shape);
}

export function elementLabel(asset: ElementAsset): string {
  return `${elementShapeLabel(asset.shape)} ${elementColorLabel(asset.color)}`;
}

export function elementByKey(key: string): ElementAsset | undefined {
  return ELEMENTS.find((e) => e.key === key);
}

/** True quando existe pelo menos um elemento disponível (a pasta pode estar vazia). */
export function hasElements(): boolean {
  return ELEMENTS.length > 0;
}
