/**
 * Biblioteca de logos de EMPRESAS ligadas ao CITi (cases, alumni, parceiros) —
 * inseríveis soltos num slide como Decoration, mesmo mecanismo dos ícones e
 * elementos (ver iconsManifest.ts / elementsManifest.ts), numa aba própria
 * dentro da seção Marca: é uma família visual diferente (logo colorido de
 * terceiro, não pictograma nem blob da casa).
 *
 * Zero configuração manual: qualquer imagem em
 * app/src/assets/company-logos/<categoria>/<slug>.<ext> aparece aqui
 * automaticamente via import.meta.glob (build-time, sem fetch em runtime).
 * Convenção de pasta: uma subpasta por categoria (cases/alumni/parceiros),
 * um arquivo por empresa. A mesma empresa pode existir em mais de uma
 * categoria (ex: Visagio é case E parceiro) — são arquivos duplicados de
 * propósito, cada categoria fica autocontida.
 */

const modules = import.meta.glob('/src/assets/company-logos/**/*.{png,webp,jpg,jpeg,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export interface CompanyLogoAsset {
  /** Chave estável: "<categoria>/<slug>" — é o que fica salvo em Decoration.assetKey. */
  key: string;
  category: string;
  name: string;
  src: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  cases: 'Cases',
  alumni: 'Alumni',
  parceiros: 'Parceiros',
};

/** Nome de exibição por slug de arquivo — a única fonte de "como essa empresa se escreve". */
const NAME_LABELS: Record<string, string> = {
  neoenergia: 'Neoenergia',
  'rchlo-riachuelo': 'Riachuelo',
  visagio: 'Visagio',
  'hospital-das-clinicas': 'Hospital das Clínicas',
  moura: 'Moura',
  deca: 'Deca',
  microsoft: 'Microsoft',
  stone: 'Stone',
  // Neurotech renomeou pra Trillia (mesma empresa, marca nova); o slug antigo
  // não existe mais em nenhuma pasta, mas fica documentado aqui pra contexto.
  trillia: 'Trillia',
  incognia: 'Incognia',
  'grupo-boticario': 'Grupo Boticário',
  accenture: 'Accenture',
  nubank: 'Nubank',
  google: 'Google',
  'porto-digital': 'Porto Digital',
  'banco-do-brasil': 'Banco do Brasil',
  meta: 'Meta',
  samsung: 'Samsung',
  ambev: 'Ambev',
  deloitte: 'Deloitte',
  avanade: 'Avanade',
  ifood: 'iFood',
  bradesco: 'Bradesco',
  'red-bull': 'Red Bull',
  cesar: 'C.E.S.A.R',
  'centro-de-informatica-ufpe': 'Centro de Informática UFPE',
  beyond: 'Beyond',
};

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length === 0 ? w : w[0]!.toUpperCase() + w.slice(1)))
    .join(' ');
}

function parsePath(path: string): { category: string; name: string } {
  const match = /\/company-logos\/([^/]+)\/([^/.]+)\.[a-zA-Z0-9]+$/.exec(path);
  return { category: match?.[1] ?? 'outros', name: match?.[2] ?? path };
}

export const COMPANY_LOGOS: CompanyLogoAsset[] = Object.entries(modules)
  .map(([path, src]) => {
    const { category, name } = parsePath(path);
    return { key: `${category}/${name}`, category, name, src };
  })
  .sort((a, b) => a.key.localeCompare(b.key));

/** Categorias disponíveis, na ordem Cases -> Alumni -> Parceiros (estável, sem duplicatas). */
const CATEGORY_ORDER = ['cases', 'alumni', 'parceiros'];
export const COMPANY_LOGO_CATEGORIES: string[] = CATEGORY_ORDER.filter((c) =>
  COMPANY_LOGOS.some((logo) => logo.category === c),
);

export function companyLogoCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? titleCase(category);
}

export function companyLogoNameLabel(name: string): string {
  return NAME_LABELS[name] ?? titleCase(name);
}

export function companyLogoByKey(key: string): CompanyLogoAsset | undefined {
  return COMPANY_LOGOS.find((logo) => logo.key === key);
}

/** True quando existe pelo menos um logo de empresa disponível (a pasta pode estar vazia). */
export function hasCompanyLogos(): boolean {
  return COMPANY_LOGOS.length > 0;
}
