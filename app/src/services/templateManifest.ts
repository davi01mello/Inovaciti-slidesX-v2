import bgCover from '@/assets/templates/bg-cover.webp';
import bgStatement from '@/assets/templates/bg-statement.webp';
import bgRows from '@/assets/templates/bg-rows.webp';
import bgProcess from '@/assets/templates/bg-process.webp';
import logoCiti from '@/assets/logo-citi-branco.png';
import logoCiti30 from '@/assets/logo-citi30-branco.png';
import type { TemplateArchetype } from '@/services/templateComposition';

/**
 * Manifesto de template: as zonas que o DESIGN de cada fundo reservou pro conteúdo,
 * como dados (retângulos normalizados 0..1) em vez de constantes espalhadas no código.
 *
 * É a peça central do modelo "a IA só escreve, o template posiciona": o motor de
 * composição lê o manifesto do fundo sorteado e encaixa título, cards, linhas e faixa
 * exatamente dentro dessas zonas — nunca em cima da logo, nunca em cima da escultura.
 *
 * Pra adicionar um fundo novo: gere uma proposta de manifesto com a IA de visão
 * (api/scripts/proposeZones.ts), ajuste os retângulos à mão se precisar e registre aqui.
 * O runtime continua 100% determinístico.
 */

/** Retângulo normalizado em relação ao slide (0..1 nos dois eixos). */
export interface Zone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateManifest {
  id: string;
  /** Arte de fundo (limpa, sem texto). */
  src: string;
  archetype: TemplateArchetype;
  /** Legibilidade do texto sobre este fundo. */
  textColor: 'light' | 'dark';
  /** A marca neste fundo: qual arquivo e em que zona ela vive. */
  logo: { src: string; zone: Zone };
  /** Área protegida ao redor da logo: NENHUM texto pode invadir este retângulo. */
  logoSafe: Zone;
  /** Zona do grupo de título (rótulo + headline + apoio) nos arquétipos com header. */
  header?: Zone;
  /** Zona principal de conteúdo (pilha central, grid de cards, linhas...). */
  content: Zone;
  /** Faixa de fecho (bloco de destaque), quando o design reservar uma. */
  banner?: Zone;
}

/** Logo pequena padrão dos slides internos (canto superior esquerdo). */
const INNER_LOGO: TemplateManifest['logo'] = {
  src: logoCiti30,
  // citi|30 anos tem proporção ~3.2:1 — 6% da altura ≈ 11% da largura.
  zone: { x: 0.045, y: 0.055, width: 0.13, height: 0.06 },
};

/** Área protegida da logo pequena: respiro generoso nos dois eixos. */
const INNER_LOGO_SAFE: Zone = { x: 0, y: 0, width: 0.24, height: 0.17 };

const cover: TemplateManifest = {
  id: 'citi-cover-01',
  src: bgCover,
  archetype: 'cover',
  textColor: 'light',
  // Na capa a logo é ELEMENTO DE DESIGN: o wordmark "citi" grande ancorando o
  // canto superior esquerdo, bem maior que a marca dos slides internos.
  logo: { src: logoCiti, zone: { x: 0.075, y: 0.13, width: 0.2, height: 0.18 } },
  logoSafe: { x: 0.05, y: 0.09, width: 0.3, height: 0.26 },
  // A escultura vive à direita (x > 0.58): o texto ocupa a metade esquerda,
  // alinhado à esquerda com a logo — uma coluna só, tudo na mesma vertical.
  content: { x: 0.075, y: 0.4, width: 0.5, height: 0.42 },
  banner: { x: 0.075, y: 0.84, width: 0.5, height: 0.11 },
};

const statement: TemplateManifest = {
  id: 'citi-statement-01',
  src: bgStatement,
  archetype: 'statement',
  textColor: 'light',
  logo: INNER_LOGO,
  logoSafe: INNER_LOGO_SAFE,
  // Escultura no terço inferior (y > 0.62): a afirmação vive centrada no vazio de cima.
  content: { x: 0.14, y: 0.18, width: 0.72, height: 0.44 },
  banner: { x: 0.14, y: 0.8, width: 0.72, height: 0.13 },
};

const cards: TemplateManifest = {
  id: 'citi-cards-01',
  src: bgProcess,
  archetype: 'cards',
  textColor: 'light',
  logo: INNER_LOGO,
  logoSafe: INNER_LOGO_SAFE,
  // Esculturas nos cantos sup-direito e inf-esquerdo; o miolo é livre.
  // Header centrado começa DEPOIS da logoSafe (x 0.24) pra nunca colidir.
  header: { x: 0.24, y: 0.07, width: 0.52, height: 0.17 },
  content: { x: 0.1, y: 0.3, width: 0.8, height: 0.56 },
  banner: { x: 0.1, y: 0.82, width: 0.8, height: 0.12 },
};

const rows: TemplateManifest = {
  id: 'citi-rows-01',
  src: bgRows,
  archetype: 'rows',
  textColor: 'light',
  logo: INNER_LOGO,
  logoSafe: INNER_LOGO_SAFE,
  // Escultura na borda direita (x > 0.78): linhas ocupam a coluna esquerda.
  // O header centraliza SOBRE a coluna das linhas (mesmo eixo), não sobre o slide —
  // título e lista compartilham o mesmo centro: simetria de verdade. E começa
  // ABAIXO da logoSafe, então nunca encosta na marca.
  header: { x: 0.07, y: 0.185, width: 0.66, height: 0.135 },
  content: { x: 0.07, y: 0.36, width: 0.66, height: 0.57 },
  banner: { x: 0.07, y: 0.83, width: 0.66, height: 0.12 },
};

const bignumber: TemplateManifest = {
  id: 'citi-bignumber-01',
  src: bgStatement,
  archetype: 'bignumber',
  textColor: 'light',
  logo: INNER_LOGO,
  logoSafe: INNER_LOGO_SAFE,
  content: { x: 0.15, y: 0.19, width: 0.7, height: 0.47 },
  banner: { x: 0.14, y: 0.8, width: 0.72, height: 0.13 },
};

/** Vários fundos por arquétipo = variedade visual sem sair da identidade. */
export const TEMPLATES: Record<TemplateArchetype, TemplateManifest[]> = {
  cover: [cover],
  statement: [statement],
  cards: [cards],
  rows: [rows],
  bignumber: [bignumber],
};

/** Hash estável (djb2) — a escolha de fundo não pode mudar entre renders/export. */
function stableHash(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * Escolhe o manifesto do slide de forma determinística: o mesmo slide sempre cai
 * no mesmo fundo (apresentação, miniatura e export idênticos), e slides vizinhos
 * do mesmo arquétipo tendem a variar quando houver mais de um fundo registrado.
 */
export function manifestFor(archetype: TemplateArchetype, seedKey: string): TemplateManifest {
  const pool = TEMPLATES[archetype];
  const first = pool[0];
  if (!first) throw new Error(`Nenhum template registrado pro arquétipo "${archetype}"`);
  if (pool.length === 1) return first;
  return pool[stableHash(seedKey) % pool.length] ?? first;
}

/**
 * Garante que uma zona de conteúdo não invade a área protegida da logo.
 * Se invadir, o topo da zona desce pra logo abaixo da logoSafe — o texto nunca
 * encosta na marca, aconteça o que acontecer com um manifesto mal anotado.
 */
export function clampBelowLogoSafe(zone: Zone, logoSafe: Zone): Zone {
  const intersects =
    zone.x < logoSafe.x + logoSafe.width &&
    zone.x + zone.width > logoSafe.x &&
    zone.y < logoSafe.y + logoSafe.height &&
    zone.y + zone.height > logoSafe.y;
  if (!intersects) return zone;
  const newY = logoSafe.y + logoSafe.height + 0.015;
  const newHeight = Math.max(0.1, zone.y + zone.height - newY);
  return { ...zone, y: newY, height: newHeight };
}
