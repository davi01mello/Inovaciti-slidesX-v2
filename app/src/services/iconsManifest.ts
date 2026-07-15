/**
 * Biblioteca de ícones/pictogramas da marca CITi (pilares, valores, áreas,
 * subáreas, serviços, fases da concepção) — inseríveis soltos num slide como
 * Decoration, mesmo mecanismo dos elementos (blobs, ver elementsManifest.ts),
 * mas numa aba SEPARADA na dock: é uma família visual diferente (pictograma
 * linha-fina preto+verde por conceito nomeado, não blob 3D colorido por forma).
 *
 * Zero configuração manual: qualquer imagem em app/src/assets/icons/<categoria>/<nome>.<ext>
 * aparece aqui automaticamente via import.meta.glob (build-time, sem fetch em runtime).
 * Convenção de pasta: uma subpasta por categoria de conceito, um arquivo por ícone.
 */

const modules = import.meta.glob('/src/assets/icons/**/*.{png,webp,jpg,jpeg,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export interface IconAsset {
  /** Chave estável: "<categoria>/<nome>" — é o que fica salvo em Decoration.assetKey. */
  key: string;
  category: string;
  name: string;
  src: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'fases-da-concepcao': 'Fases da Concepção',
  pilares: 'Pilares',
  servicos: 'Serviços',
  subareas: 'Subáreas',
  valores: 'Valores',
  areas: 'Áreas',
};

const NAME_LABELS: Record<string, string> = {
  ideacao: 'Ideação',
  imersao: 'Imersão',
  pesquisa: 'Pesquisa',
  prototipacao: 'Prototipação',
  'teste-de-usabilidade': 'Teste de Usabilidade',
  diversidade: 'Diversidade',
  experimentacao: 'Experimentação',
  inovacao: 'Inovação',
  'transformacao-digital': 'Transformação Digital',
  concepcao: 'Concepção',
  desenvolvimento: 'Desenvolvimento',
  'eu-sou-o-citi-e-o-citi-sou-eu': 'Eu Sou o CITi e o CITi Sou Eu',
  comercial: 'Comercial',
  design: 'Design',
  financeiro: 'Financeiro',
  'inteligencia-de-dados': 'Inteligência de Dados',
  marketing: 'Marketing',
  'dna-experimentador': 'DNA Experimentador',
  'espirito-de-time': 'Espírito de Time',
  'jogo-limpo': 'Jogo Limpo',
  'todos-pelo-cliente': 'Todos pelo Cliente',
  'vai-la-marca-e-comemora': 'Vai Lá, Marca e Comemora',
  negocios: 'Negócios',
  pessoas: 'Pessoas',
  solucoes: 'Soluções',
};

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length === 0 ? w : w[0]!.toUpperCase() + w.slice(1)))
    .join(' ');
}

function parsePath(path: string): { category: string; name: string } {
  const match = /\/icons\/([^/]+)\/([^/.]+)\.[a-zA-Z0-9]+$/.exec(path);
  return { category: match?.[1] ?? 'outros', name: match?.[2] ?? path };
}

export const ICONS: IconAsset[] = Object.entries(modules)
  .map(([path, src]) => {
    const { category, name } = parsePath(path);
    return { key: `${category}/${name}`, category, name, src };
  })
  .sort((a, b) => a.key.localeCompare(b.key));

/** Categorias disponíveis, na ordem em que aparecem nos ícones (estável e sem duplicatas). */
export const ICON_CATEGORIES: string[] = Array.from(new Set(ICONS.map((i) => i.category)));

export function iconCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? titleCase(category);
}

export function iconNameLabel(name: string): string {
  return NAME_LABELS[name] ?? titleCase(name);
}

export function iconLabel(asset: IconAsset): string {
  return `${iconNameLabel(asset.name)} · ${iconCategoryLabel(asset.category)}`;
}

export function iconByKey(key: string): IconAsset | undefined {
  return ICONS.find((i) => i.key === key);
}

/** True quando existe pelo menos um ícone disponível (a pasta pode estar vazia). */
export function hasIcons(): boolean {
  return ICONS.length > 0;
}
