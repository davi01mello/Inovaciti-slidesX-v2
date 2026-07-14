/**
 * O EIXO DE COR. Uma apresentação inteira nasce de UM número.
 *
 *   0.0 ──────────── 0.5 ──────────── 1.0
 *   Névoa           Oceano          Floresta
 *   branco gelo     azul CITi       verde CITi
 *   #E8F6F1         #2DAEDB         #2DDB60
 *
 * (Não é coincidência que os dois hexes coloridos rimem: #2DDB60 e #2DAEDB são o
 * mesmo acorde, girado.)
 *
 * Esse número faz DUAS coisas, e é a combinação delas que dá coerência ao deck:
 *   1. escolhe as ARTES  (deckArt.ts monta o deck com artes vizinhas no eixo);
 *   2. pinta o CROMO     (rótulo, traço, número do card, borda, faixa, destaque).
 *
 * Nenhum componente escreve verde na mão. Arrastar a barra repinta o deck inteiro.
 *
 * SYNC_WITH: brand/tools/build_templates.py (que mede o `tone` de cada arte).
 */

/* -------------------------------------------------------------------------- */
/* OKLab                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Interpolar cor em sRGB direto ACINZENTA o meio do degradê — e o meio deste
 * degradê é justamente o azul, a cor mais importante do eixo. O problema é que
 * sRGB é uma escala perceptual (gamma ~2.2), então a média aritmética de dois
 * valores não é a cor que está visualmente no meio dos dois: ela cai num buraco
 * escuro e lavado.
 *
 * OKLab é um espaço onde distância euclidiana ≈ distância percebida. A média de
 * duas cores nele É a cor do meio. É o que faz a barra ficar bonita em vez de
 * suja, e é por isso que o cromo do slide e o trilho da barra usam a MESMA
 * função (WYSIWYG: a cor que você arrasta é literalmente a cor que sai no slide).
 */
interface Oklab {
  L: number;
  a: number;
  b: number;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    Number.parseInt(h.slice(0, 2), 16) / 255,
    Number.parseInt(h.slice(2, 4), 16) / 255,
    Number.parseInt(h.slice(4, 6), 16) / 255,
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (c: number) =>
    Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function hexToOklab(hex: string): Oklab {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = srgbToLinear(r8);
  const g = srgbToLinear(g8);
  const b = srgbToLinear(b8);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToHex({ L, a, b }: Oklab): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return rgbToHex(
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  );
}

/* -------------------------------------------------------------------------- */
/* O eixo                                                                      */
/* -------------------------------------------------------------------------- */

export interface ToneBand {
  /** Onde a faixa começa no eixo. */
  at: number;
  label: string;
  hex: string;
}

/** Os três polos do eixo. A barra de cor desenha exatamente estes rótulos. */
export const TONE_BANDS: ToneBand[] = [
  { at: 0, label: 'Névoa', hex: '#E8F6F1' },
  { at: 0.5, label: 'Oceano', hex: '#2DAEDB' },
  { at: 1, label: 'Floresta', hex: '#2DDB60' },
];

/** O tom padrão de um deck novo: o verde da casa. */
export const DEFAULT_TONE = 1;

const ANCHORS = TONE_BANDS.map((band) => ({ at: band.at, lab: hexToOklab(band.hex) }));

function mixLab(a: Oklab, b: Oklab, t: number): Oklab {
  return { L: a.L + (b.L - a.L) * t, a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t };
}

export function clampTone(tone: number): number {
  if (!Number.isFinite(tone)) return DEFAULT_TONE;
  return Math.min(1, Math.max(0, tone));
}

/** A cor do eixo neste ponto, em OKLab. É daqui que TUDO (cromo e barra) deriva. */
function accentLab(tone: number): Oklab {
  const t = clampTone(tone);
  for (let i = 1; i < ANCHORS.length; i++) {
    const lo = ANCHORS[i - 1]!;
    const hi = ANCHORS[i]!;
    if (t <= hi.at) return mixLab(lo.lab, hi.lab, (t - lo.at) / (hi.at - lo.at));
  }
  return ANCHORS[ANCHORS.length - 1]!.lab;
}

/** O acento vivo deste tom. Névoa → branco gelo · Oceano → azul · Floresta → verde. */
export function accentFor(tone: number): string {
  return oklabToHex(accentLab(tone));
}

/**
 * O ACENTO PROFUNDO: mesmo matiz, luminância baixa.
 *
 * ARMADILHA que isto resolve: no extremo Névoa o acento é quase branco. Escrito
 * sobre uma arte de fundo CLARO (a espiral branca), isso é texto invisível — e
 * "invisível" não é um bug que aparece num teste, é um bug que aparece na frente
 * do cliente. Sobre arte clara o slide usa este acento em vez do vivo.
 *
 * O piso de croma existe porque um branco gelo escurecido vira cinza morto: sem
 * ele, o acento profundo da Névoa não seria da CITi, seria de qualquer um.
 */
export function accentDeepFor(tone: number): string {
  const lab = accentLab(tone);
  const chroma = Math.hypot(lab.a, lab.b);
  const hue = Math.atan2(lab.b, lab.a);
  const boosted = Math.max(chroma, 0.088);
  return oklabToHex({ L: 0.47, a: Math.cos(hue) * boosted, b: Math.sin(hue) * boosted });
}

/** Uma variação de luminância do acento, mantendo o matiz (halos, brilhos, hovers). */
export function accentAtLightness(tone: number, lightness: number): string {
  const lab = accentLab(tone);
  return oklabToHex({ ...lab, L: Math.min(1, Math.max(0, lightness)) });
}

export function toneBandOf(tone: number): ToneBand {
  const t = clampTone(tone);
  if (t < 0.34) return TONE_BANDS[0]!;
  if (t < 0.75) return TONE_BANDS[1]!;
  return TONE_BANDS[2]!;
}

/**
 * O trilho da barra de cor, desenhado pela MESMA função que pinta o slide.
 *
 * Um `linear-gradient` de 3 paradas seria interpolado pelo browser em sRGB, o
 * que acinzenta o meio (ver o comentário do OKLab lá em cima). Amostrando o eixo
 * em N paradas, a interpolação que o browser faz entre duas paradas vizinhas é
 * curta demais pra sujar: o degradê inteiro passa a ser o do OKLab.
 */
export function toneGradientCss(angle = '90deg', steps = 24): string {
  const stops: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stops.push(`${accentFor(t)} ${(t * 100).toFixed(1)}%`);
  }
  return `linear-gradient(${angle}, ${stops.join(', ')})`;
}

/* -------------------------------------------------------------------------- */
/* O cromo do slide                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Tudo que o slide precisa saber sobre cor, derivado do tom e da arte.
 *
 * Nenhum componente da composição escreve uma cor na mão: eles leem daqui. É
 * isso que faz arrastar a barra repintar o deck inteiro em tempo real, sem
 * tocar em uma letra do texto.
 */
export interface SlideChrome {
  /** Rótulo, traço, número do card, borda, destaque. Já resolve arte clara sozinho. */
  accent: string;
  /** Versões translúcidas do acento, pra filetes e bordas. */
  accentBorder: string;
  accentFaint: string;
  /** Brilho do acento. Vazio em arte clara: halo sobre branco é sujeira, não luz. */
  accentGlow: string;
  /** Sombra de texto do rótulo. Vazia em arte clara. */
  accentTextGlow: string;
  /** Tinta principal, secundária e fraca — invertidas em arte clara. */
  ink: string;
  inkSoft: string;
  inkFaint: string;
  /** O véu vai desta cor: escuro sobre arte escura, claro sobre arte clara. */
  veilRgb: string;
  /**
   * O vidro dos cards, com a densidade JÁ resolvida pela ocupação medida.
   * `cardBg(cost)`: sobre preto liso o card é translúcido e a arte aparece; sobre a
   * escultura acesa ele fica denso e o texto sobrevive. Ver glassOpacityFor.
   */
  cardBg: (opacity: number) => string;
  cardBorder: string;
  /** Moldura da foto do usuário (arquétipo media). */
  frameBorder: string;
  /** true quando a arte é clara e a tinta virou escura. */
  light: boolean;
}

export function chromeFor(tone: number, light: boolean): SlideChrome {
  // Sobre arte clara o acento vivo some. O profundo tem o mesmo matiz e sobrevive.
  const accent = light ? accentDeepFor(tone) : accentFor(tone);
  const [r, g, b] = hexToRgb(accent).map((c) => Math.round(c * 255));

  return {
    accent,
    accentBorder: `rgba(${r}, ${g}, ${b}, 0.30)`,
    accentFaint: `rgba(${r}, ${g}, ${b}, 0.14)`,
    // Glow desligado na arte clara: um halo verde sobre branco não brilha, mancha.
    accentGlow: light ? 'none' : `0 0 1.1cqw rgba(${r}, ${g}, ${b}, 0.42)`,
    accentTextGlow: light ? 'none' : `0 0 0.9cqw rgba(${r}, ${g}, ${b}, 0.40)`,
    ink: light ? 'rgba(9, 16, 13, 0.94)' : 'rgba(247, 249, 248, 0.97)',
    inkSoft: light ? 'rgba(15, 26, 22, 0.80)' : 'rgba(240, 245, 243, 0.82)',
    inkFaint: light ? 'rgba(22, 36, 31, 0.62)' : 'rgba(232, 240, 237, 0.62)',
    veilRgb: light ? '245, 250, 248' : '4, 8, 6',
    cardBg: (opacity: number) =>
      light
        ? `linear-gradient(180deg, rgba(255,255,255,${opacity.toFixed(2)}), rgba(248,252,250,${(opacity * 0.88).toFixed(2)}))`
        : `linear-gradient(180deg, rgba(12, 20, 16, ${opacity.toFixed(2)}), rgba(4, 8, 6, ${(opacity * 0.9).toFixed(2)}))`,
    cardBorder: light ? `rgba(${r}, ${g}, ${b}, 0.22)` : `rgba(${r}, ${g}, ${b}, 0.18)`,
    frameBorder: light ? `rgba(${r}, ${g}, ${b}, 0.28)` : `rgba(${r}, ${g}, ${b}, 0.24)`,
    light,
  };
}
