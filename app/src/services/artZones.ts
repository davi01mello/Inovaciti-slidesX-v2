/**
 * O MOTOR DE ZONAS.
 *
 * O princípio inteiro do sistema cabe numa frase: MEÇA A ARTE, NÃO A ANOTE.
 *
 * O motor antigo tinha as zonas de texto anotadas à mão, um retângulo por
 * arquétipo, e é exatamente por isso que ele nunca passou de quatro fundos —
 * ninguém vai anotar 38 artes x 9 arquétipos na mão, então todo deck saía igual.
 *
 * Aqui a build MEDE cada arte e guarda uma grade de ocupação 16x9
 * (templateArt.generated.ts). Em runtime, cada arquétipo propõe VÁRIOS arranjos
 * possíveis (texto à esquerda, à direita, centrado, cards embaixo, foto ao
 * lado...) e este módulo pontua cada arranjo contra a grade DAQUELA arte. Ganha
 * o mais vazio.
 *
 * As consequências são o motivo de valer o esforço:
 *   · o texto NUNCA cai em cima da escultura, em nenhuma arte;
 *   · a mesma arte muda de arranjo conforme o arquétipo, e o mesmo arquétipo
 *     muda de arranjo conforme a arte  →  variedade real, sem sorteio burro;
 *   · arte nova entra sozinha: joga o PNG na pasta, roda o script, acabou.
 */
import { GRID_COLS, GRID_ROWS, type TemplateArt } from '@/services/templateArt.generated';

/** Retângulo normalizado em relação ao slide (0..1 nos dois eixos). */
export interface Zone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Archetype =
  | 'cover'
  | 'section'
  | 'statement'
  | 'quote'
  | 'cards'
  | 'topics'
  | 'split'
  | 'media'
  | 'bignumber'
  | 'kpis'
  | 'compare'
  | 'timeline'
  | 'closing';

/** Um layout inteiro do slide, não um retângulo solto. */
export interface Arrangement {
  id: string;
  /** Grupo de título (rótulo + headline + apoio), quando o arranjo separa título de conteúdo. */
  header?: Zone;
  /** A zona principal: a pilha de texto, o grid de cards, a lista de tópicos. */
  content: Zone;
  /** A coluna auxiliar: cards ao lado do texto (split) ou a foto do usuário (media). */
  aside?: Zone;
  /** Faixa de fecho (frase de destaque), quando o arranjo reservar uma. */
  banner?: Zone;
  align: 'left' | 'center';
}

/* -------------------------------------------------------------------------- */
/* O que cai em cima da arte                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A OCUPAÇÃO DE UMA ZONA SÓ IMPORTA NA PROPORÇÃO EM QUE A ARTE APARECE ATRÁS DELA.
 *
 * Sem esta distinção o motor comete dois erros que eu vi acontecerem nos números:
 *
 * - a FOTO do usuário (arquétipo media) é opaca: ela TAPA a escultura. Cobrar
 *   ocupação dela fazia o motor fugir de pôr a foto em cima do brilho — que é
 *   justamente o melhor lugar pra pôr a foto, porque ela resolve o brilho.
 * - os CARDS são vidro: eles já são o próprio véu. Cobrar ocupação cheia deles
 *   estourava o véu no talo em todo slide de cards e matava a arte atrás.
 *
 * Texto pelado, aí sim, tem a arte inteira embaixo. Esse paga o preço cheio.
 */
export type Surface = 'text' | 'glass' | 'opaque';

// O vidro custa MAIS do que eu supus. Medindo no print: um card translúcido em cima
// de uma escultura ACESA não "atenua" a escultura, ele a borra num paçoca cinza que
// parece defeito de render. O card se defende do preto liso, não de um brilho forte.
// Com 0.45 o motor topava jogar os cards em cima da escultura; com 0.62 ele foge.
const SURFACE_WEIGHT: Record<Surface, number> = { text: 1, glass: 0.62, opaque: 0 };

interface SlotSurfaces {
  header?: Surface;
  content: Surface;
  aside?: Surface;
  banner?: Surface;
}

const SURFACES: Record<Archetype, SlotSurfaces> = {
  cover: { content: 'text' },
  section: { content: 'text' },
  statement: { content: 'text' },
  quote: { content: 'text' },
  bignumber: { content: 'text' },
  // Tópico é lista LEVE (número + filete + linha), sem caixa nenhuma: texto pelado.
  topics: { header: 'text', content: 'text' },
  // KPIs e timeline são texto pelado também: número/etapa + rótulo, sem caixa.
  kpis: { header: 'text', content: 'text' },
  timeline: { header: 'text', content: 'text' },
  cards: { header: 'text', content: 'glass' },
  // Os dois painéis da comparação são caixas de vidro, como os cards.
  compare: { header: 'text', content: 'glass' },
  split: { content: 'text', aside: 'glass' },
  media: { content: 'text', aside: 'opaque' },
  closing: { content: 'text', banner: 'glass' },
};

/* -------------------------------------------------------------------------- */
/* Amostragem da grade                                                         */
/* -------------------------------------------------------------------------- */

interface Sample {
  /** Média de ocupação da zona (0..99). */
  mean: number;
  /** Pior célula da zona (0..99). */
  peak: number;
}

/**
 * Quanto de cada célula da grade cai dentro da zona, e o que isso diz sobre ela.
 *
 * A cobertura é FRACIONÁRIA de propósito: uma zona quase nunca se alinha com a
 * grade, e arredondar célula pra dentro ou pra fora deslocaria a medida em até
 * meia célula (3% do slide) — o suficiente pra achar que o texto está limpo
 * quando ele está com o pé em cima da escultura.
 */
function sampleZone(grid: number[], zone: Zone): Sample {
  const cellW = 1 / GRID_COLS;
  const cellH = 1 / GRID_ROWS;
  const x1 = zone.x + zone.width;
  const y1 = zone.y + zone.height;

  let weighted = 0;
  let totalWeight = 0;
  let maxCoverage = 0;
  const cells: { occ: number; coverage: number }[] = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    const cy0 = row * cellH;
    const cy1 = cy0 + cellH;
    const overlapH = Math.min(y1, cy1) - Math.max(zone.y, cy0);
    if (overlapH <= 0) continue;

    for (let col = 0; col < GRID_COLS; col++) {
      const cx0 = col * cellW;
      const cx1 = cx0 + cellW;
      const overlapW = Math.min(x1, cx1) - Math.max(zone.x, cx0);
      if (overlapW <= 0) continue;

      const coverage = (overlapW / cellW) * (overlapH / cellH);
      const occ = grid[row * GRID_COLS + col] ?? 0;
      weighted += occ * coverage;
      totalWeight += coverage;
      if (coverage > maxCoverage) maxCoverage = coverage;
      cells.push({ occ, coverage });
    }
  }

  if (totalWeight <= 0) return { mean: 0, peak: 0 };

  // O PICO só conta células que a zona de fato ocupa. O limiar é relativo à maior
  // cobertura da própria zona, não absoluto: uma zona baixinha (um rótulo de 5%
  // de altura) nunca cobre metade de uma célula, e um limiar fixo zeraria o pico
  // dela — justo o texto mais frágil do slide ficaria sem proteção.
  const floor = maxCoverage * 0.5;
  let peak = 0;
  for (const cell of cells) {
    if (cell.coverage >= floor && cell.occ > peak) peak = cell.occ;
  }

  return { mean: weighted / totalWeight, peak };
}

/**
 * O custo de pôr texto nesta zona desta arte. 0 = vazio liso, 1 = escultura pura.
 *
 * Média E PICO, e o pico pesa quase tanto quanto a média de propósito: uma zona
 * quase toda preta (média baixíssima) com UM facho de luz cruzando ela destrói a
 * linha que cair ali. A média sozinha diria "pode escrever" e o slide sairia com
 * metade de um título apagado no brilho. Foi por isso que o pico entrou.
 */
export function zoneCost(grid: number[], zone: Zone): number {
  const { mean, peak } = sampleZone(grid, zone);
  return (mean / 99) * 0.55 + (peak / 99) * 0.45;
}

/* -------------------------------------------------------------------------- */
/* O véu                                                                       */
/* -------------------------------------------------------------------------- */

/** Abaixo disso a arte já é lisa o bastante: véu ZERO, a arte aparece inteira. */
const VEIL_CLEAN = 0.08;
/** A partir daqui o véu vai ao máximo. */
const VEIL_FULL = 0.46;
/** Teto: mesmo na pior arte sobra arte visível atrás do texto. */
const VEIL_MAX = 0.78;

/**
 * A REDE DE SEGURANÇA, e ela é obrigatória.
 *
 * O motor escolhe o arranjo mais limpo, mas "mais limpo" não é o mesmo que
 * "limpo": numa arte carregada, TODOS os arranjos sujam. Quando isso acontece,
 * um véu (gradiente suave) entra atrás do texto, com opacidade PROPORCIONAL à
 * ocupação medida.
 *
 * Arte limpa → véu zero, e a arte aparece inteira, do jeito que o designer fez.
 * Arte carregada → véu o quanto precisar. Contraste garantido SEMPRE, não
 * "quase sempre".
 */
export function veilFor(cost: number): number {
  const t = (cost - VEIL_CLEAN) / (VEIL_FULL - VEIL_CLEAN);
  return Math.round(Math.min(1, Math.max(0, t)) * VEIL_MAX * 100) / 100;
}

/**
 * O véu das zonas de VIDRO, embutido no próprio vidro.
 *
 * Um card sobre preto liso pode ser translúcido e bonito; o mesmo card sobre uma
 * escultura acesa precisa de mais corpo, senão o brilho atravessa o vidro e passa
 * por trás das letras. Em vez de empilhar um véu ATRÁS do card (que apagaria a
 * arte na faixa inteira, inclusive nos vãos entre os cards), o card fica mais
 * denso na medida exata da ocupação. A arte continua viva entre eles.
 */
export function glassOpacityFor(cost: number): number {
  const t = Math.min(1, Math.max(0, (cost - VEIL_CLEAN) / (VEIL_FULL - VEIL_CLEAN)));
  return Math.round((0.62 + t * 0.32) * 100) / 100;
}

/* -------------------------------------------------------------------------- */
/* A marca                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * O PISO DA LOGO: nenhuma zona de texto nasce acima disso.
 *
 * ARMADILHA que isto evita: a versão anterior tinha um "clamp de segurança" que
 * empurrava a zona pra baixo quando ela invadia a logo — e ele ESPREMIA a altura
 * da zona no caminho, fazendo o título encolher e o subtítulo virar letra de
 * bula. Os arranjos aqui já nascem abaixo do piso. O clamp continua existindo
 * (`clampBelowLogo`), mas como rede, não como rotina: se ele disparar, é bug de
 * arranjo, não comportamento normal.
 */
export const LOGO_FLOOR_Y = 0.185;

const LOGO_W = 0.115;
const LOGO_H = 0.052;
const LOGO_MARGIN_X = 0.055;
const LOGO_MARGIN_Y = 0.062;

/** A logo maior da capa: ali ela é elemento de design, não assinatura. */
const HERO_LOGO_W = 0.155;
const HERO_LOGO_H = 0.072;

const HERO_ARCHETYPES = new Set<Archetype>(['cover', 'closing']);

function logoZone(side: 'left' | 'right', hero: boolean): Zone {
  const width = hero ? HERO_LOGO_W : LOGO_W;
  const height = hero ? HERO_LOGO_H : LOGO_H;
  return {
    x: side === 'left' ? LOGO_MARGIN_X : 1 - LOGO_MARGIN_X - width,
    y: LOGO_MARGIN_Y,
    width,
    height,
  };
}

/**
 * De que lado a marca vai. Medindo os dois cantos, ela nunca cai em cima da
 * escultura — e, empatado, ela fica do lado da coluna de texto, que é o que um
 * designer faria: marca e texto na mesma vertical.
 */
function chooseLogoSide(art: TemplateArt, hero: boolean, contentX: number): 'left' | 'right' {
  const left = logoZone('left', hero);
  const right = logoZone('right', hero);
  // Um respiro em volta da logo entra na conta: encostar num brilho já é encostar.
  const pad = (z: Zone): Zone => ({
    x: Math.max(0, z.x - 0.02),
    y: Math.max(0, z.y - 0.025),
    width: z.width + 0.04,
    height: z.height + 0.05,
  });
  const costLeft = zoneCost(art.grid, pad(left));
  const costRight = zoneCost(art.grid, pad(right));

  const AFFINITY = 0.06; // desempate estético, nunca vence uma escultura de verdade
  const bias = contentX < 0.4 ? -AFFINITY : contentX > 0.5 ? AFFINITY : 0;
  return costLeft + bias <= costRight ? 'left' : 'right';
}

/** Rede de segurança: uma zona jamais invade a faixa da logo. Ver LOGO_FLOOR_Y. */
export function clampBelowLogo(zone: Zone): Zone {
  if (zone.y >= LOGO_FLOOR_Y) return zone;
  const bottom = zone.y + zone.height;
  return { ...zone, y: LOGO_FLOOR_Y, height: Math.max(0.12, bottom - LOGO_FLOOR_Y) };
}

/* -------------------------------------------------------------------------- */
/* Composição                                                                  */
/* -------------------------------------------------------------------------- */

/** Uma zona já escolhida, medida e protegida. */
export interface PlacedZone extends Zone {
  /** Custo medido de ocupação (0..1) — o que o overlay de depuração desenha. */
  cost: number;
  /**
   * Opacidade do véu que precisa entrar atrás do texto (0 = nenhum).
   * Zero em zona de vidro (o card já é o véu) e em zona opaca (a foto tapa tudo).
   */
  veil: number;
  /** Como o conteúdo desta zona se apoia na arte. Ver o comentário de Surface. */
  surface: Surface;
}

export interface Composition {
  artId: string;
  archetype: Archetype;
  arrangementId: string;
  header?: PlacedZone;
  content: PlacedZone;
  aside?: PlacedZone;
  banner?: PlacedZone;
  align: 'left' | 'center';
  logo: Zone;
  logoSide: 'left' | 'right';
  /** Custo do arranjo inteiro. É o que o diretor de arte usa como "encaixe". */
  cost: number;
}

function place(grid: number[], zone: Zone, surface: Surface): PlacedZone {
  const safe = clampBelowLogo(zone);
  const cost = zoneCost(grid, safe);
  // Só texto pelado ganha véu. Vidro e foto já se defendem sozinhos, e um véu
  // ali só apagaria a arte atrás de um card que nem precisava dele.
  return { ...safe, cost, surface, veil: surface === 'text' ? veilFor(cost) : 0 };
}

/**
 * O custo do arranjo INTEIRO: média ponderada E pior zona, meio a meio.
 *
 * O termo da PIOR ZONA existe pelo mesmo motivo que o pico existe dentro de uma
 * zona, um nível acima — e eu só descobri o peso certo medindo. Com o pior caso
 * valendo só 30%, o motor escolheu, numa arte com a escultura à DIREITA, um
 * arranjo de tópicos que jogava o título bem em cima dela: a lista (zona grande
 * e limpa, à esquerda) diluía na média o título (zona pequena e destruída). O
 * arranjo pontuava bem e era ilegível.
 *
 * Uma zona arruinada arruína o slide, não importa o tamanho dela. Meio a meio.
 *
 * O peso de cada zona é área x transparência: uma foto opaca gigante não custa
 * nada (ela TAPA a arte) e não entra no pior caso.
 */
function arrangementCost(zones: PlacedZone[]): number {
  let weighted = 0;
  let totalWeight = 0;
  let worst = 0;
  for (const zone of zones) {
    const w = zone.width * zone.height * SURFACE_WEIGHT[zone.surface];
    if (w <= 0) continue;
    weighted += zone.cost * w;
    totalWeight += w;
    // O pior caso só olha o que de fato sofre com a arte atrás.
    if (zone.surface === 'text' && zone.cost > worst) worst = zone.cost;
  }
  const mean = totalWeight > 0 ? weighted / totalWeight : 0;
  return mean * 0.55 + worst * 0.45;
}

function evaluate(art: TemplateArt, archetype: Archetype, arrangement: Arrangement): Composition {
  const surfaces = SURFACES[archetype];
  const header = arrangement.header
    ? place(art.grid, arrangement.header, surfaces.header ?? 'text')
    : undefined;
  const content = place(art.grid, arrangement.content, surfaces.content);
  const aside = arrangement.aside
    ? place(art.grid, arrangement.aside, surfaces.aside ?? 'text')
    : undefined;
  const banner = arrangement.banner
    ? place(art.grid, arrangement.banner, surfaces.banner ?? 'glass')
    : undefined;

  const zones = [header, content, aside, banner].filter((z): z is PlacedZone => !!z);
  const hero = HERO_ARCHETYPES.has(archetype);
  const anchorX = (header ?? content).x;
  const logoSide = chooseLogoSide(art, hero, anchorX);

  return {
    artId: art.id,
    archetype,
    arrangementId: arrangement.id,
    header,
    content,
    aside,
    banner,
    align: arrangement.align,
    logo: logoZone(logoSide, hero),
    logoSide,
    cost: arrangementCost(zones),
  };
}

/** Memo: o diretor de arte pede as composições de 38 artes x 9 arquétipos, várias vezes. */
const allMemo = new Map<string, Composition[]>();

/**
 * TODOS os arranjos deste arquétipo nesta arte, medidos, do mais limpo pro mais sujo.
 *
 * O diretor de arte precisa da lista inteira, não só do vencedor: às vezes vale
 * usar o SEGUNDO melhor arranjo de uma arte pra não repetir o desenho de um slide
 * anterior. Enxergando só o campeão de cada arte, o motor não tinha essa carta na
 * mão e 1 em cada 15 decks saía com dois slides no mesmo layout.
 */
export function composeAll(art: TemplateArt, archetype: Archetype): Composition[] {
  const key = `${art.id}:${archetype}`;
  let list = allMemo.get(key);
  if (!list) {
    list = ARRANGEMENTS[archetype]
      .map((arrangement) => evaluate(art, archetype, arrangement))
      .sort((a, b) => a.cost - b.cost);
    allMemo.set(key, list);
  }
  return list;
}

/**
 * O arranjo de MENOR CUSTO deste arquétipo NESTA arte, com as zonas já medidas,
 * o véu já calculado e o canto da marca já escolhido.
 *
 * É esta função que faz a mesma arte servir a papéis diferentes: pedir `cards`
 * numa arte com a escultura à esquerda devolve um arranjo, pedir `statement` na
 * mesma arte devolve outro. Ninguém sorteia nada.
 */
export function composeArt(art: TemplateArt, archetype: Archetype): Composition {
  return composeAll(art, archetype)[0]!;
}

/** O arranjo que o diretor de arte escolheu pro deck. Cai no melhor se o id sumir. */
export function composeArtAs(
  art: TemplateArt,
  archetype: Archetype,
  arrangementId: string,
): Composition {
  const all = composeAll(art, archetype);
  return all.find((c) => c.arrangementId === arrangementId) ?? all[0]!;
}

/**
 * Onde o véu já ficou forte o bastante pra começar a APAGAR a arte. Abaixo disso a
 * arte sobrevive e o texto está limpo — as duas coisas ao mesmo tempo.
 */
const FIT_SATED = 0.24;

/**
 * "Encaixe medido": 1 = o texto cabe limpo E a arte sobrevive, 0 = não cabe.
 *
 * O encaixe SATURA, e essa é a correção mais importante que os números me
 * obrigaram a fazer. Com o encaixe linear (1 - custo), o diretor escolhia a MESMA
 * capa em 7 de 8 decks: a arte mais VAZIA da coleção sempre vencia, porque "mais
 * vazio" sempre pontuava mais. O deck saía ótimo no papel e sempre igual na tela,
 * com 27 capas lindas encostadas. Medindo, o pior véu que ele topava numa capa era
 * 0.19 — ele recusava arte dramática de graça, sem ganhar legibilidade nenhuma.
 *
 * Abaixo de FIT_SATED o véu ainda é leve e a arte aparece inteira. Uma arte de
 * custo 0.05 e uma de custo 0.22 produzem o mesmo texto legível; ninguém vê a
 * diferença. Otimizar essa diferença é otimizar um número que não existe pra quem
 * olha — e o preço é o deck inteiro ficar igual.
 *
 * Aqui embaixo, portanto, todas empatam, e quem decide passa a ser o eixo de cor e
 * o id da apresentação. Acima, o encaixe volta a mandar: legibilidade é veto.
 */
export function fitFromCost(cost: number): number {
  if (cost <= FIT_SATED) return 1;
  return Math.max(0, 1 - (cost - FIT_SATED) / (1 - FIT_SATED));
}

/* -------------------------------------------------------------------------- */
/* O CATÁLOGO DE ARRANJOS                                                      */
/* -------------------------------------------------------------------------- */
/*
 * Pelo menos TRÊS por arquétipo (esquerda / direita / centro), porque é isso que
 * permite a mesma arte servir a papéis diferentes e dois slides vizinhos não
 * caírem no mesmo desenho.
 *
 * Todos nascem abaixo de LOGO_FLOOR_Y (0.185) e dentro das margens seguras. As
 * medidas são frações do slide: x/width no eixo de 16, y/height no de 9.
 */

/** Margem lateral padrão. Tudo respira a partir daqui. */
const M = 0.068;
const RIGHT = 1 - M;

/** Faixa de fecho: sempre no mesmo piso, pra o deck ter uma linha de base comum. */
const banner = (x: number, width: number): Zone => ({ x, y: 0.845, width, height: 0.105 });

export const ARRANGEMENTS: Record<Archetype, Arrangement[]> = {
  /* Capa: UM bloco grande. A arte é a estrela, o texto ocupa um terço e some. */
  cover: [
    { id: 'cover-left', content: { x: M, y: 0.34, width: 0.46, height: 0.48 }, align: 'left' },
    { id: 'cover-right', content: { x: 0.47, y: 0.34, width: RIGHT - 0.47, height: 0.48 }, align: 'left' },
    { id: 'cover-center', content: { x: 0.17, y: 0.30, width: 0.66, height: 0.50 }, align: 'center' },
    // Texto rente ao chão: funciona quando a escultura toma o slide inteiro por cima.
    { id: 'cover-floor', content: { x: M, y: 0.52, width: 0.56, height: 0.36 }, align: 'left' },
  ],

  /* Separador: um respiro. Rótulo grande e título, nada mais. */
  section: [
    { id: 'section-left', content: { x: M, y: 0.36, width: 0.50, height: 0.34 }, align: 'left' },
    { id: 'section-right', content: { x: 0.44, y: 0.36, width: RIGHT - 0.44, height: 0.34 }, align: 'left' },
    { id: 'section-center', content: { x: 0.18, y: 0.34, width: 0.64, height: 0.36 }, align: 'center' },
  ],

  /* Afirmação central: a tese vivendo sozinha, com o parágrafo que a sustenta. */
  statement: [
    { id: 'statement-left', content: { x: M, y: 0.24, width: 0.52, height: 0.58 }, align: 'left' },
    { id: 'statement-right', content: { x: 0.42, y: 0.24, width: RIGHT - 0.42, height: 0.58 }, align: 'left' },
    { id: 'statement-center', content: { x: 0.15, y: 0.24, width: 0.70, height: 0.56 }, align: 'center' },
    { id: 'statement-low', content: { x: M, y: 0.42, width: 0.60, height: 0.46 }, align: 'left' },
  ],

  /*
   * Cards: 3 caixas lado a lado.
   *
   * Este arquétipo é o que menos consegue fugir: a fileira de cards quer largura,
   * e uma fileira que atravessa o slide inteiro atropela QUALQUER escultura que
   * esteja na faixa dela. Por isso existem as variantes ESTREITAS: 70% de largura
   * ainda dá 350px por card (folgado pros 20 a 45 palavras do corpo), e ganha 16%
   * de slide pra deslizar pro lado limpo. Sem elas, todo slide de cards saía com
   * o véu no talo e a arte morria atrás dele.
   */
  cards: [
    {
      id: 'cards-title-left',
      header: { x: M, y: 0.19, width: 0.58, height: 0.24 },
      content: { x: M, y: 0.455, width: 1 - 2 * M, height: 0.42 },
      align: 'left',
    },
    {
      id: 'cards-title-right',
      header: { x: 0.38, y: 0.19, width: RIGHT - 0.38, height: 0.24 },
      content: { x: M, y: 0.455, width: 1 - 2 * M, height: 0.42 },
      align: 'left',
    },
    {
      id: 'cards-title-center',
      header: { x: 0.16, y: 0.19, width: 0.68, height: 0.24 },
      content: { x: 0.085, y: 0.455, width: 1 - 2 * 0.085, height: 0.42 },
      align: 'center',
    },
    // Tudo empurrado pra baixo: deixa a metade de cima da arte inteiramente livre.
    {
      id: 'cards-low',
      header: { x: M, y: 0.20, width: 0.60, height: 0.23 },
      content: { x: M, y: 0.47, width: 1 - 2 * M, height: 0.40 },
      align: 'left',
    },
    {
      id: 'cards-hug-left',
      header: { x: M, y: 0.19, width: 0.54, height: 0.24 },
      content: { x: M, y: 0.455, width: 0.72, height: 0.42 },
      align: 'left',
    },
    {
      id: 'cards-hug-right',
      header: { x: 0.30, y: 0.19, width: RIGHT - 0.30, height: 0.24 },
      content: { x: RIGHT - 0.72, y: 0.455, width: 0.72, height: 0.42 },
      align: 'left',
    },
    /*
     * FAIXAS (o "O que fica ao fim" da referência): cada card vira uma linha
     * full-width com número gigante, linha vertical, ícone e texto. É um desenho
     * deliberado (o render lê o id), não uma consequência da proporção — e dá ao
     * diretor de arte uma alternativa REAL ao grid de colunas.
     */
    {
      id: 'cards-rows',
      header: { x: M, y: 0.175, width: 0.62, height: 0.20 },
      content: { x: M, y: 0.415, width: 1 - 2 * M, height: 0.475 },
      align: 'left',
    },
    {
      id: 'cards-rows-center',
      header: { x: 0.17, y: 0.175, width: 0.66, height: 0.20 },
      content: { x: 0.10, y: 0.415, width: 0.80, height: 0.475 },
      align: 'center',
    },
  ],

  /* Tópicos: lista LEVE numerada. Uma coluna estreita basta, então dá pra fugir muito. */
  topics: [
    {
      id: 'topics-left',
      header: { x: M, y: 0.19, width: 0.58, height: 0.26 },
      content: { x: M, y: 0.49, width: 0.58, height: 0.39 },
      align: 'left',
    },
    {
      id: 'topics-right',
      header: { x: 0.42, y: 0.19, width: RIGHT - 0.42, height: 0.26 },
      content: { x: 0.42, y: 0.49, width: RIGHT - 0.42, height: 0.39 },
      align: 'left',
    },
    // Título numa coluna, lista na outra: o desenho clássico de agenda.
    {
      id: 'topics-aside',
      header: { x: M, y: 0.22, width: 0.33, height: 0.56 },
      content: { x: 0.47, y: 0.21, width: RIGHT - 0.47, height: 0.62 },
      align: 'left',
    },
    {
      id: 'topics-aside-flip',
      header: { x: 0.60, y: 0.22, width: RIGHT - 0.60, height: 0.56 },
      content: { x: M, y: 0.21, width: 0.48, height: 0.62 },
      align: 'left',
    },
    {
      id: 'topics-center',
      header: { x: 0.17, y: 0.19, width: 0.66, height: 0.26 },
      content: { x: 0.22, y: 0.49, width: 0.56, height: 0.39 },
      align: 'center',
    },
  ],

  /*
   * Split: contexto de um lado, cards/tópicos do outro.
   *
   * As variantes "hug" existem porque as duas primeiras NÃO conseguem fugir de uma
   * escultura que ocupa uma metade inteira do slide: texto de um lado + apoio do
   * outro precisa das duas metades, por definição. Nesse caso a saída é empilhar
   * os dois no MESMO lado limpo, com os cards em fileira estreita. Sem elas, o
   * motor era obrigado a jogar os cards em cima do vidro aceso.
   */
  split: [
    {
      id: 'split-text-left',
      content: { x: M, y: 0.21, width: 0.38, height: 0.64 },
      aside: { x: 0.50, y: 0.21, width: RIGHT - 0.50, height: 0.64 },
      align: 'left',
    },
    {
      id: 'split-text-right',
      content: { x: 0.56, y: 0.21, width: RIGHT - 0.56, height: 0.64 },
      aside: { x: M, y: 0.21, width: 0.42, height: 0.64 },
      align: 'left',
    },
    // Tudo na metade limpa: título em cima, fileira de cards embaixo.
    {
      id: 'split-hug-left',
      content: { x: M, y: 0.19, width: 0.52, height: 0.27 },
      aside: { x: M, y: 0.51, width: 0.52, height: 0.36 },
      align: 'left',
    },
    {
      id: 'split-hug-right',
      content: { x: RIGHT - 0.52, y: 0.19, width: 0.52, height: 0.27 },
      aside: { x: RIGHT - 0.52, y: 0.51, width: 0.52, height: 0.36 },
      align: 'left',
    },
    // Texto largo em cima, apoio largo embaixo: quando a arte só tem o meio livre.
    {
      id: 'split-stack',
      content: { x: M, y: 0.19, width: 0.66, height: 0.26 },
      aside: { x: M, y: 0.50, width: 1 - 2 * M, height: 0.37 },
      align: 'left',
    },
  ],

  /* Media: a foto do usuário é CONTEÚDO, emoldurada ao lado do texto. */
  media: [
    {
      id: 'media-photo-right',
      content: { x: M, y: 0.22, width: 0.40, height: 0.62 },
      aside: { x: 0.53, y: 0.20, width: RIGHT - 0.53, height: 0.66 },
      align: 'left',
    },
    {
      id: 'media-photo-left',
      content: { x: 0.54, y: 0.22, width: RIGHT - 0.54, height: 0.62 },
      aside: { x: M, y: 0.20, width: 0.40, height: 0.66 },
      align: 'left',
    },
    // Foto em faixa larga no alto, texto embaixo: bom pra foto panorâmica.
    {
      id: 'media-photo-band',
      content: { x: M, y: 0.63, width: 1 - 2 * M, height: 0.27 },
      aside: { x: M, y: 0.19, width: 1 - 2 * M, height: 0.38 },
      align: 'left',
    },
  ],

  /* Citação/impacto: a manchete e a frase de síntese vivendo sozinhas, grandes. */
  quote: [
    { id: 'quote-left', content: { x: M, y: 0.26, width: 0.56, height: 0.52 }, align: 'left' },
    { id: 'quote-right', content: { x: 0.40, y: 0.26, width: RIGHT - 0.40, height: 0.52 }, align: 'left' },
    { id: 'quote-center', content: { x: 0.16, y: 0.26, width: 0.68, height: 0.52 }, align: 'center' },
    { id: 'quote-low', content: { x: M, y: 0.46, width: 0.60, height: 0.42 }, align: 'left' },
  ],

  /* Número em destaque: o número é a peça, o resto é legenda. */
  bignumber: [
    { id: 'bignumber-center', content: { x: 0.17, y: 0.22, width: 0.66, height: 0.62 }, align: 'center' },
    { id: 'bignumber-left', content: { x: M, y: 0.23, width: 0.54, height: 0.60 }, align: 'left' },
    { id: 'bignumber-right', content: { x: 0.42, y: 0.23, width: RIGHT - 0.42, height: 0.60 }, align: 'left' },
  ],

  /*
   * KPIs: painel de 2 a 4 métricas. Texto pelado (número em destaque + rótulo),
   * então dá pra fugir bastante: banda larga embaixo, ou coluna ao lado do título.
   */
  kpis: [
    {
      id: 'kpis-band',
      header: { x: M, y: 0.19, width: 0.60, height: 0.24 },
      content: { x: M, y: 0.49, width: 1 - 2 * M, height: 0.37 },
      align: 'left',
    },
    {
      id: 'kpis-band-center',
      header: { x: 0.17, y: 0.19, width: 0.66, height: 0.24 },
      content: { x: 0.085, y: 0.49, width: 1 - 2 * 0.085, height: 0.37 },
      align: 'center',
    },
    // Título numa coluna, métricas empilhadas na outra: o desenho de dashboard.
    {
      id: 'kpis-aside',
      header: { x: M, y: 0.22, width: 0.34, height: 0.52 },
      content: { x: 0.47, y: 0.21, width: RIGHT - 0.47, height: 0.60 },
      align: 'left',
    },
    {
      id: 'kpis-aside-flip',
      header: { x: 0.60, y: 0.22, width: RIGHT - 0.60, height: 0.52 },
      content: { x: M, y: 0.21, width: 0.48, height: 0.60 },
      align: 'left',
    },
    // Encolhida no lado limpo, quando a escultura toma uma metade.
    {
      id: 'kpis-hug-left',
      header: { x: M, y: 0.19, width: 0.52, height: 0.24 },
      content: { x: M, y: 0.49, width: 0.72, height: 0.37 },
      align: 'left',
    },
    /*
     * PÔSTER (o "O CITi em números" oficial): números gigantes sem caixa, então
     * o conteúdo é texto pelado numa área grande — o motor foge da escultura e
     * os números convivem com a arte atrás.
     */
    {
      id: 'kpis-poster-center',
      header: { x: 0.16, y: 0.185, width: 0.68, height: 0.19 },
      content: { x: 0.11, y: 0.42, width: 0.78, height: 0.47 },
      align: 'center',
    },
    {
      id: 'kpis-poster-left',
      header: { x: M, y: 0.185, width: 0.58, height: 0.19 },
      content: { x: M, y: 0.42, width: 0.66, height: 0.47 },
      align: 'left',
    },
    {
      id: 'kpis-poster-right',
      header: { x: 0.36, y: 0.185, width: RIGHT - 0.36, height: 0.19 },
      content: { x: 0.34, y: 0.42, width: RIGHT - 0.34, height: 0.47 },
      align: 'left',
    },
  ],

  /*
   * Comparação: dois painéis de vidro frente a frente. Como os cards, a fileira
   * quer largura — as variantes "hug" a 72% deslizam pro lado limpo da arte.
   */
  compare: [
    {
      id: 'compare-band',
      header: { x: M, y: 0.19, width: 0.58, height: 0.23 },
      content: { x: M, y: 0.47, width: 1 - 2 * M, height: 0.40 },
      align: 'left',
    },
    {
      id: 'compare-band-center',
      header: { x: 0.17, y: 0.19, width: 0.66, height: 0.23 },
      content: { x: 0.085, y: 0.47, width: 1 - 2 * 0.085, height: 0.40 },
      align: 'center',
    },
    {
      id: 'compare-hug-left',
      header: { x: M, y: 0.19, width: 0.52, height: 0.23 },
      content: { x: M, y: 0.46, width: 0.72, height: 0.40 },
      align: 'left',
    },
    {
      id: 'compare-hug-right',
      header: { x: 0.30, y: 0.19, width: RIGHT - 0.30, height: 0.23 },
      content: { x: RIGHT - 0.72, y: 0.46, width: 0.72, height: 0.40 },
      align: 'left',
    },
  ],

  /*
   * Timeline: etapas em sequência. Banda horizontal quando a largura permite
   * (o desenho clássico de roadmap), coluna vertical quando a arte pede lado.
   * Quem decide fileira vs pilha é a PROPORÇÃO da zona (ver zoneAspect no render).
   */
  timeline: [
    {
      id: 'timeline-band',
      header: { x: M, y: 0.19, width: 0.60, height: 0.23 },
      content: { x: M, y: 0.465, width: 1 - 2 * M, height: 0.41 },
      align: 'left',
    },
    {
      id: 'timeline-band-center',
      header: { x: 0.17, y: 0.19, width: 0.66, height: 0.23 },
      content: { x: 0.085, y: 0.465, width: 1 - 2 * 0.085, height: 0.41 },
      align: 'center',
    },
    // Título em cima, etapas em coluna vertical no lado limpo.
    {
      id: 'timeline-column-left',
      header: { x: M, y: 0.19, width: 0.55, height: 0.22 },
      content: { x: M, y: 0.46, width: 0.50, height: 0.42 },
      align: 'left',
    },
    {
      id: 'timeline-column-right',
      header: { x: 0.44, y: 0.19, width: RIGHT - 0.44, height: 0.22 },
      content: { x: 0.47, y: 0.46, width: RIGHT - 0.47, height: 0.42 },
      align: 'left',
    },
    // Título numa coluna, jornada vertical na outra: o desenho de metodologia.
    {
      id: 'timeline-aside',
      header: { x: M, y: 0.22, width: 0.33, height: 0.56 },
      content: { x: 0.46, y: 0.21, width: RIGHT - 0.46, height: 0.62 },
      align: 'left',
    },
  ],

  /* Encerramento: capa de novo, mas calma. A faixa carrega o próximo passo. */
  closing: [
    {
      id: 'closing-left',
      content: { x: M, y: 0.34, width: 0.48, height: 0.42 },
      banner: banner(M, 0.48),
      align: 'left',
    },
    {
      id: 'closing-right',
      content: { x: 0.46, y: 0.34, width: RIGHT - 0.46, height: 0.42 },
      banner: banner(0.46, RIGHT - 0.46),
      align: 'left',
    },
    {
      id: 'closing-center',
      content: { x: 0.18, y: 0.32, width: 0.64, height: 0.42 },
      banner: banner(0.24, 0.52),
      align: 'center',
    },
  ],
};

/**
 * A proporção REAL de uma zona (o slide é 16:9, então fração != proporção).
 *
 * Usada pra decidir se os cards entram em FILEIRA ou EMPILHADOS: numa coluna alta e
 * estreita, três cards lado a lado teriam 200px cada e o corpo viraria letra de
 * bula; numa faixa larga e baixa, três cards empilhados viram três tiras de
 * letreiro. A forma da zona decide a forma dos cards.
 */
export function zoneAspect(zone: Zone): number {
  if (zone.height <= 0) return 1;
  return (zone.width * 16) / (zone.height * 9);
}

/* -------------------------------------------------------------------------- */
/* O canto mais vazio                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Onde encaixar o LOGO DO CLIENTE na capa: o canto mais vazio da arte que ainda
 * não está ocupado nem pela marca CITi nem pelo texto.
 *
 * A mesma grade que posiciona o texto resolve isso de graça. O canto de baixo é
 * preferido porque os de cima disputam com a marca da casa, e duas marcas no
 * mesmo topo é briga, não composição.
 */
export function emptiestCorner(art: TemplateArt, composition: Composition): Zone {
  const w = 0.13;
  const h = 0.09;
  const mx = 0.055;
  const my = 0.06;

  const corners: { id: string; zone: Zone; bias: number }[] = [
    { id: 'bottom-left', zone: { x: mx, y: 1 - my - h, width: w, height: h }, bias: 0 },
    { id: 'bottom-right', zone: { x: 1 - mx - w, y: 1 - my - h, width: w, height: h }, bias: 0 },
    // Os cantos de cima só entram se os de baixo estiverem impossíveis, e nunca o
    // canto onde a marca da CITi já está.
    { id: 'top-left', zone: { x: mx, y: my, width: w, height: h }, bias: 0.25 },
    { id: 'top-right', zone: { x: 1 - mx - w, y: my, width: w, height: h }, bias: 0.25 },
  ];

  const overlapsContent = (zone: Zone): boolean => {
    const c = composition.content;
    return (
      zone.x < c.x + c.width && zone.x + zone.width > c.x && zone.y < c.y + c.height && zone.y + zone.height > c.y
    );
  };

  let best = corners[0]!;
  let bestScore = Infinity;
  for (const corner of corners) {
    const isCitiCorner =
      corner.id.startsWith('top') && corner.id.endsWith(composition.logoSide);
    const score =
      zoneCost(art.grid, corner.zone) +
      corner.bias +
      (isCitiCorner ? 10 : 0) +
      (overlapsContent(corner.zone) ? 1.5 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = corner;
    }
  }
  return best.zone;
}
