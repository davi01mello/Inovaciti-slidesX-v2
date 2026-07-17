/**
 * Sanitiza a saída "crua" do Gemini antes de devolver pro front.
 *
 * Isto NÃO é só uma defesa contra alucinação de formato. É a CAMADA 2 das três que
 * aplicam as regras de forma do produto:
 *
 *   1. o prompt PEDE     (intelligence/writing.ts)
 *   2. o servidor CORTA  (este arquivo)          <- a única garantia de verdade
 *   3. a UI não deixa    (o botão "+ novo" some no teto)
 *
 * Modelo nenhum obedece um limite numérico 100% das vezes. Enquanto o corte não
 * existiu, "no máximo 3 cards" virava 5 cards de vez em quando — e cinco caixotes
 * empilhados é literalmente o defeito que este trabalho veio consertar. Pedir sem
 * cortar é torcer.
 *
 * A RÉGUA MUDOU DE EIXO. A versão anterior garantia uma "gramática por VOZ": a voz
 * do deck ditava os blocos de todo slide de conteúdo, duas das três vozes eram
 * quase-vazias por design, e a poda derrubava BLOCOS INTEIROS até caber num teto por
 * slide — o textão virava slide só-título, e a densidade oscilava entre extremos.
 * Agora a garantia opera em dois níveis:
 *
 *   POR BLOCO   nenhum texto passa do teto de palavras dele (body 25, tópico 12...),
 *               com poda por FRASE/cláusula, nunca no meio de uma ideia.
 *   POR FORMATO cada slide de conteúdo É um formato do catálogo (inferido dos blocos
 *               presentes) com gramática e faixa próprias; a poda respeita o PISO do
 *               formato e NUNCA remove o bloco que o define.
 *
 * A voz virou o que o nome diz: ritmo de redação + tendência na escolha (só prompt).
 */
import { MAX_CARDS, MAX_COMPARE_POINTS, MAX_STATS, MAX_STEPS, MAX_TOPICS, SLIDE_ICONS } from './types.js';
import type {
  GeneratedBlock,
  GeneratedCard,
  GeneratedCardsBlock,
  GeneratedCompareBlock,
  GeneratedCompareSide,
  GeneratedSlide,
  GeneratedStatItem,
  GeneratedStatsBlock,
  GeneratedStepsBlock,
  GeneratedTextBlock,
  GeneratedTopicsBlock,
  RichRun,
  RichText,
  SlideIconName,
} from './types.js';

const SLIDE_ICON_SET = new Set<string>(SLIDE_ICONS);

/** Ícone válido do vocabulário, ou undefined (o item sobrevive sem ícone). */
function normalizeIcon(raw: unknown): SlideIconName | undefined {
  return typeof raw === 'string' && SLIDE_ICON_SET.has(raw) ? (raw as SlideIconName) : undefined;
}

const TEXT_KINDS = new Set([
  'title-1',
  'title-2',
  'title-3',
  'subtitle',
  'body',
  'highlight',
  'section-label',
]);

const LAYOUTS = new Set(['cover', 'section', 'content', 'closing']);
const ALIGNS = new Set(['left', 'center', 'right', 'justify']);

// Remove control chars (preservando \n e \t): defesa contra bytes estranhos vindos do
// modelo ou de um client malicioso, que poderiam sujar logs, arquivos e o render do front.
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

function sanitizeText(text: string): string {
  return text.replace(CONTROL_CHARS, '');
}

function normalizeRichText(value: unknown): RichText {
  if (!Array.isArray(value)) return [];
  const out: RichText = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const rawText = (item as Record<string, unknown>)['text'];
    if (typeof rawText !== 'string') continue;
    const text = sanitizeText(rawText);
    if (text.length === 0) continue;
    const run: RichRun = { text };
    if ((item as Record<string, unknown>)['bold']) run.bold = true;
    if ((item as Record<string, unknown>)['highlight']) run.highlight = true;
    out.push(run);
  }
  // Trim só nas bordas do texto completo: espaços entre runs são significativos
  // (ex: um run destacado no meio da frase), então cada run não pode ser trimado sozinho.
  const first = out[0];
  if (first) first.text = first.text.replace(/^\s+/, '');
  const last = out[out.length - 1];
  if (last) last.text = last.text.replace(/\s+$/, '');
  return out.filter((run) => run.text.length > 0);
}

/* -------------------------------------------------------------------------- */
/* Palavras e poda por frase                                                   */
/* -------------------------------------------------------------------------- */

function wordsOf(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function plainOf(rich: RichText): string {
  return rich.map((r) => r.text).join('');
}

function wordsIn(rich: RichText): number {
  return wordsOf(plainOf(rich));
}

/** Corta o texto rico num offset de caractere, preservando runs e marcações. */
function sliceRich(rich: RichText, endOffset: number): RichText {
  const out: RichText = [];
  let pos = 0;
  for (const run of rich) {
    if (pos >= endOffset) break;
    const take = Math.min(run.text.length, endOffset - pos);
    if (take > 0) out.push({ ...run, text: run.text.slice(0, take) });
    pos += run.text.length;
  }
  const last = out[out.length - 1];
  if (last) {
    last.text = last.text.replace(/\s+$/, '');
    if (last.text.length === 0) out.pop();
  }
  return out;
}

/**
 * O TETO POR BLOCO, com poda por FRASE. É a garantia de "nenhum bloco vira textão".
 *
 * A versão antiga só sabia derrubar o bloco inteiro — e derrubar um body de 40
 * palavras deixava o slide só-título, trocando um defeito (parede) pelo outro
 * (slide oco). Aqui o corte preserva ideias inteiras:
 *
 *   1. mantém frases completas até caber no teto;
 *   2. frase única longa demais: poda na última vírgula que ainda cabe;
 *   3. sem fronteira decente dentro da tolerância: fica como veio (melhor 30 e
 *      poucas palavras que uma frase amputada no meio) — o log do offBand enxerga.
 */
function trimRichToWords(rich: RichText, maxWords: number): RichText {
  const plain = plainOf(rich);
  if (wordsOf(plain) <= maxWords) return rich;

  // Tolerância proporcional: uma frase inteira levemente acima do teto é melhor
  // que uma frase amputada no meio.
  const hardCeil = Math.ceil(maxWords * 1.3);

  // Fim de frase: pontuação final seguida de espaço (ou fim do texto).
  const boundaries: number[] = [];
  const sentenceEnd = /[.!?…](?=\s|$)/g;
  let match: RegExpExecArray | null;
  while ((match = sentenceEnd.exec(plain)) !== null) boundaries.push(match.index + 1);

  let best = -1;
  for (const boundary of boundaries) {
    if (wordsOf(plain.slice(0, boundary)) <= maxWords) best = boundary;
    else break;
  }
  if (best > 0) return sliceRich(rich, best);

  // Nenhuma frase coube inteira no teto. Se a PRIMEIRA cabe na tolerância, corta
  // nela: 26 palavras de uma frase completa vencem 44 de três.
  const firstBoundary = boundaries[0] ?? -1;
  if (firstBoundary > 0 && firstBoundary < plain.length && wordsOf(plain.slice(0, firstBoundary)) <= hardCeil) {
    return sliceRich(rich, firstBoundary);
  }

  // Frase única dentro da tolerância: fica como está.
  if (wordsOf(plain) <= hardCeil) return rich;

  // Última carta: poda por cláusula, na última vírgula que ainda cabe no teto.
  let cut = -1;
  const comma = /,/g;
  while ((match = comma.exec(plain)) !== null) {
    if (wordsOf(plain.slice(0, match.index)) <= maxWords) cut = match.index;
    else break;
  }
  if (cut > 0) {
    const sliced = sliceRich(rich, cut);
    const last = sliced[sliced.length - 1];
    if (last) last.text = `${last.text.replace(/[,;\s]+$/, '')}.`;
    return sliced;
  }
  // Sem fronteira decente: melhor 30 e poucas palavras que um corte no meio.
  // O log do offBand enxerga o que sobrar acima da faixa.
  return rich;
}

/**
 * Tetos de palavras por peça. O nível do BLOCO é o nível certo da régua de
 * densidade: é ele que mata a parede de texto sem esvaziar o slide.
 */
const CAP_TEXT_BLOCK = 25; // body, subtitle, highlight: nenhum passa disso
const CAP_TITLE = 14; //      título é curto por design; 14 já é manchete longa
const CAP_LIST_ITEM = 12; //  tópico, etapa, ponto de comparação
const CAP_CARD_BODY = 16;
const CAP_STAT_LABEL = 8;
const CAP_STAT_VALUE = 6; //  acima disso não é métrica, é frase: o item cai

/** Aplica o teto de palavras a um bloco qualquer, sem nunca esvaziá-lo. */
function capBlockWords(block: GeneratedBlock): GeneratedBlock {
  if (block.kind === 'cards') {
    return {
      kind: 'cards',
      items: block.items.map((card) => ({
        ...card,
        title: trimRichToWords(card.title, 6),
        body: trimRichToWords(card.body, CAP_CARD_BODY),
      })),
    };
  }
  if (block.kind === 'topics' || block.kind === 'steps') {
    return { kind: block.kind, items: block.items.map((item) => trimRichToWords(item, CAP_LIST_ITEM)) };
  }
  if (block.kind === 'stats') {
    return {
      kind: 'stats',
      items: block.items
        .filter((s) => wordsIn(s.value) <= CAP_STAT_VALUE)
        .map((s) => ({ ...s, value: s.value, label: trimRichToWords(s.label, CAP_STAT_LABEL) })),
    };
  }
  if (block.kind === 'compare') {
    return {
      kind: 'compare',
      sides: block.sides.map((side) => ({
        ...side,
        label: trimRichToWords(side.label, 5),
        points: side.points.map((p) => trimRichToWords(p, CAP_LIST_ITEM)),
      })),
    };
  }
  const cap = block.kind === 'title-1' || block.kind === 'title-2' || block.kind === 'title-3'
    ? CAP_TITLE
    : block.kind === 'section-label'
      ? 5
      : CAP_TEXT_BLOCK;
  return { ...block, content: trimRichToWords(block.content, cap) };
}

/* -------------------------------------------------------------------------- */
/* Destaques                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * O DESTAQUE, CORTADO NO SERVIDOR. Camada 2 da regra "seja cirúrgico".
 *
 * DOIS destaques distintos, como no deck de referência da marca:
 *
 *   TÍTULO   o segmento-chave do título sai na cor de destaque ("Três fases.
 *            {Seis semanas.}"). Até 5 palavras, UM por slide. É a assinatura
 *            visual mais forte do deck oficial.
 *   CORPO    o destaque cirúrgico de sempre: 1 a 3 palavras, UM por slide, só
 *            no coração da mensagem.
 *
 * Modelo nenhum obedece 100%: às vezes pinta a frase inteira ou marca três coisas.
 * Texto todo verde é o defeito que aparece na frente do cliente, então o servidor
 * GARANTE: destaque longo some, e só o PRIMEIRO de cada categoria sobrevive.
 */
const TITLE_HIGHLIGHT_MAX_WORDS = 5;
const HIGHLIGHT_MAX_WORDS = 3;

const TITLE_KINDS = new Set(['title-1', 'title-2', 'title-3']);

/** Percorre todo texto rico do slide: um destaque de título + um de corpo, no máximo. */
function capHighlights(blocks: GeneratedBlock[]): void {
  let titleUsed = false;
  let bodyUsed = false;
  const visit = (rich: RichText, isTitle: boolean) => {
    for (const run of rich) {
      if (!run.highlight) continue;
      const max = isTitle ? TITLE_HIGHLIGHT_MAX_WORDS : HIGHLIGHT_MAX_WORDS;
      const used = isTitle ? titleUsed : bodyUsed;
      if (used || wordsOf(run.text) > max) {
        delete run.highlight;
      } else if (isTitle) {
        titleUsed = true;
      } else {
        bodyUsed = true;
      }
    }
  };
  for (const block of blocks) {
    if (block.kind === 'cards') {
      for (const card of block.items) {
        visit(card.title, false);
        visit(card.body, false);
      }
    } else if (block.kind === 'topics' || block.kind === 'steps') {
      for (const item of block.items) visit(item, false);
    } else if (block.kind === 'stats') {
      for (const item of block.items) {
        visit(item.value, false);
        visit(item.label, false);
      }
    } else if (block.kind === 'compare') {
      for (const side of block.sides) {
        visit(side.label, false);
        for (const point of side.points) visit(point, false);
      }
    } else {
      visit(block.content, TITLE_KINDS.has(block.kind));
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Normalização de blocos                                                      */
/* -------------------------------------------------------------------------- */

function normalizeAlign(value: unknown): GeneratedTextBlock['align'] {
  return typeof value === 'string' && ALIGNS.has(value)
    ? (value as Exclude<GeneratedTextBlock['align'], undefined>)
    : undefined;
}

/** Um card SÓ é card se tiver título E corpo. Sem corpo é um tópico disfarçado: cai fora. */
function normalizeCard(raw: unknown): GeneratedCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const title = normalizeRichText((raw as Record<string, unknown>)['title']);
  const body = normalizeRichText((raw as Record<string, unknown>)['body']);
  if (title.length === 0 || body.length === 0) return null;
  const icon = normalizeIcon((raw as Record<string, unknown>)['icon']);
  return icon ? { title, body, icon } : { title, body };
}

/** Uma métrica precisa de valor E rótulo, e o valor precisa carregar um dígito. */
function normalizeStat(raw: unknown): GeneratedStatItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = normalizeRichText((raw as Record<string, unknown>)['value']);
  const label = normalizeRichText((raw as Record<string, unknown>)['label']);
  if (value.length === 0 || label.length === 0) return null;
  if (!/\d/.test(plainOf(value))) return null;
  const icon = normalizeIcon((raw as Record<string, unknown>)['icon']);
  return icon ? { value, label, icon } : { value, label };
}

function normalizeCompareSide(raw: unknown): GeneratedCompareSide | null {
  if (!raw || typeof raw !== 'object') return null;
  const label = normalizeRichText((raw as Record<string, unknown>)['label']);
  const rawPoints = (raw as Record<string, unknown>)['points'];
  const points = (Array.isArray(rawPoints) ? rawPoints : [])
    .map(normalizeRichText)
    .filter((rt) => rt.length > 0)
    .slice(0, MAX_COMPARE_POINTS);
  if (label.length === 0 || points.length === 0) return null;
  const icon = normalizeIcon((raw as Record<string, unknown>)['icon']);
  return icon ? { label, points, icon } : { label, points };
}

export function normalizeBlock(raw: unknown): GeneratedBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const kind = record['kind'];

  if (kind === 'cards') {
    const rawCards = record['cards'];
    const items = (Array.isArray(rawCards) ? rawCards : [])
      .map(normalizeCard)
      .filter((c): c is GeneratedCard => c !== null)
      .slice(0, MAX_CARDS); // NUNCA 4, NUNCA 5.
    if (items.length === 0) return null;
    return { kind: 'cards', items };
  }

  if (kind === 'topics') {
    const rawTopics = record['topics'];
    const items = (Array.isArray(rawTopics) ? rawTopics : [])
      .map(normalizeRichText)
      .filter((rt) => rt.length > 0)
      .slice(0, MAX_TOPICS); // NUNCA 6.
    if (items.length === 0) return null;
    return { kind: 'topics', items };
  }

  if (kind === 'stats') {
    const rawStats = record['stats'] ?? record['items'];
    const items = (Array.isArray(rawStats) ? rawStats : [])
      .map(normalizeStat)
      .filter((s): s is GeneratedStatItem => s !== null)
      .slice(0, MAX_STATS);
    if (items.length === 0) return null;
    return { kind: 'stats', items };
  }

  if (kind === 'steps') {
    const rawSteps = record['steps'] ?? record['items'];
    const items = (Array.isArray(rawSteps) ? rawSteps : [])
      .map(normalizeRichText)
      .filter((rt) => rt.length > 0)
      .slice(0, MAX_STEPS);
    if (items.length === 0) return null;
    return { kind: 'steps', items };
  }

  if (kind === 'compare') {
    const rawSides = record['sides'];
    const sides = (Array.isArray(rawSides) ? rawSides : [])
      .map(normalizeCompareSide)
      .filter((s): s is GeneratedCompareSide => s !== null)
      .slice(0, 2);
    if (sides.length === 0) return null;
    // Comparação de UM lado não compara nada: degrada pra tópicos com os pontos.
    if (sides.length === 1) {
      const only = sides[0]!;
      return { kind: 'topics', items: only.points.slice(0, MAX_TOPICS) };
    }
    return { kind: 'compare', sides };
  }

  if (typeof kind === 'string' && TEXT_KINDS.has(kind)) {
    const content = normalizeRichText(record['content']);
    if (content.length === 0) return null;
    return {
      kind: kind as GeneratedTextBlock['kind'],
      align: normalizeAlign(record['align']),
      content,
    };
  }

  return null;
}

/** Um bloco que o corte deixou sem conteúdo não pode chegar ao front. */
function isEmptyBlock(block: GeneratedBlock): boolean {
  if (block.kind === 'cards' || block.kind === 'topics' || block.kind === 'steps' || block.kind === 'stats') {
    return block.items.length === 0;
  }
  if (block.kind === 'compare') return block.sides.length < 2;
  return block.content.length === 0;
}

export function normalizeSlide(raw: unknown): GeneratedSlide | null {
  if (!raw || typeof raw !== 'object') return null;
  const layout = (raw as Record<string, unknown>)['layout'];
  if (typeof layout !== 'string' || !LAYOUTS.has(layout)) return null;
  const rawBlocks = (raw as Record<string, unknown>)['blocks'];
  const blocks = Array.isArray(rawBlocks)
    ? rawBlocks.map(normalizeBlock).filter((b): b is GeneratedBlock => b !== null)
    : [];
  if (blocks.length === 0) return null;
  const kept = dedupeLists(blocks)
    .map(capBlockWords)
    .filter((b) => !isEmptyBlock(b));
  if (kept.length === 0) return null;
  capHighlights(kept);
  return { layout: layout as GeneratedSlide['layout'], blocks: kept };
}

/**
 * UMA lista por slide, e nunca duas.
 *
 * Cards e tópicos (e agora etapas) no mesmo slide é a receita do slide poluído: duas
 * hierarquias visuais brigando pelo mesmo olhar. O prompt proíbe, mas o modelo às
 * vezes manda os dois "pra enriquecer". Fica a primeira lista na ordem de preferência
 * (cards > steps > topics), cai o resto. stats e compare não entram nesta disputa
 * entre si à toa: eles são deduplicados pela gramática do formato (inferFormat pega
 * o defining block e a gramática derruba o que não pertence).
 */
function dedupeLists(blocks: GeneratedBlock[]): GeneratedBlock[] {
  const lists = blocks.filter((b) => b.kind === 'cards' || b.kind === 'topics' || b.kind === 'steps');
  if (lists.length <= 1) return blocks;
  const keep = lists.find((b) => b.kind === 'cards') ?? lists.find((b) => b.kind === 'steps') ?? lists[0];
  return blocks.filter((b) =>
    b.kind === 'cards' || b.kind === 'topics' || b.kind === 'steps' ? b === keep : true,
  );
}

/* -------------------------------------------------------------------------- */
/* A GRAMÁTICA DO FORMATO                                                      */
/*                                                                             */
/* Todo slide de conteúdo É um formato do catálogo (ver FORMAT_CATALOG em       */
/* intelligence/writing.ts). O formato é INFERIDO dos blocos presentes — nunca  */
/* declarado e persistido, então a edição manual do usuário não deixa um rótulo */
/* velho pra trás. Cada formato tem os blocos permitidos, o bloco que o DEFINE  */
/* (que a poda jamais remove) e a faixa de palavras do slide.                   */
/* -------------------------------------------------------------------------- */

export type SlideFormat =
  | 'afirmacao'
  | 'apoio'
  | 'citacao'
  | 'topicos'
  | 'cards'
  | 'split'
  | 'numero'
  | 'indicadores'
  | 'comparacao'
  | 'jornada';

interface FormatGrammar {
  /** Kinds permitidos além do title-2 (que todo formato tem). */
  allowed: Set<string>;
  /** O bloco que define o formato. A poda NUNCA o remove. Null = o título define. */
  defining: string | null;
  floor: number;
  ceil: number;
}

const FORMAT_GRAMMAR: Record<SlideFormat, FormatGrammar> = {
  afirmacao: { allowed: new Set(['section-label', 'subtitle']), defining: null, floor: 3, ceil: 16 },
  apoio: { allowed: new Set(['section-label', 'subtitle', 'body']), defining: 'body', floor: 15, ceil: 33 },
  citacao: { allowed: new Set(['section-label', 'highlight']), defining: 'highlight', floor: 9, ceil: 28 },
  topicos: { allowed: new Set(['section-label', 'subtitle', 'topics']), defining: 'topics', floor: 14, ceil: 40 },
  cards: { allowed: new Set(['section-label', 'subtitle', 'cards']), defining: 'cards', floor: 18, ceil: 48 },
  split: {
    allowed: new Set(['section-label', 'subtitle', 'body', 'topics', 'cards']),
    defining: 'body',
    floor: 26,
    ceil: 55,
  },
  numero: { allowed: new Set(['section-label', 'subtitle', 'stats']), defining: 'stats', floor: 6, ceil: 26 },
  indicadores: { allowed: new Set(['section-label', 'subtitle', 'stats']), defining: 'stats', floor: 10, ceil: 34 },
  comparacao: { allowed: new Set(['section-label', 'subtitle', 'compare']), defining: 'compare', floor: 16, ceil: 46 },
  jornada: { allowed: new Set(['section-label', 'subtitle', 'steps']), defining: 'steps', floor: 14, ceil: 40 },
};

/** O formato que os blocos deste slide de conteúdo declaram, pelo bloco mais forte. */
export function inferFormat(blocks: GeneratedBlock[]): SlideFormat {
  const kinds = new Set(blocks.map((b) => b.kind));
  if (kinds.has('compare')) return 'comparacao';
  if (kinds.has('stats')) {
    const stats = blocks.find((b): b is GeneratedStatsBlock => b.kind === 'stats')!;
    return stats.items.length === 1 ? 'numero' : 'indicadores';
  }
  if (kinds.has('steps')) return 'jornada';
  if ((kinds.has('cards') || kinds.has('topics')) && kinds.has('body')) return 'split';
  if (kinds.has('cards')) return 'cards';
  if (kinds.has('topics')) return 'topicos';
  if (kinds.has('body')) return 'apoio';
  if (kinds.has('highlight')) return 'citacao';
  return 'afirmacao';
}

const CONTENT_TITLE_KINDS = new Set(['title-1', 'title-2', 'title-3']);

/** Palavras de um bloco qualquer. */
function blockWords(block: GeneratedBlock): number {
  if (block.kind === 'cards') return block.items.reduce((n, c) => n + wordsIn(c.title) + wordsIn(c.body), 0);
  if (block.kind === 'topics' || block.kind === 'steps')
    return block.items.reduce((n, t) => n + wordsIn(t), 0);
  if (block.kind === 'stats')
    return block.items.reduce((n, s) => n + wordsIn(s.value) + wordsIn(s.label), 0);
  if (block.kind === 'compare')
    return block.sides.reduce(
      (n, side) => n + wordsIn(side.label) + side.points.reduce((m, p) => m + wordsIn(p), 0),
      0,
    );
  return wordsIn(block.content);
}

function totalWords(blocks: GeneratedBlock[]): number {
  return blocks.reduce((n, b) => n + blockWords(b), 0);
}

/** A melhor fonte de texto pra virar título quando o slide de conteúdo veio sem um. */
function borrowTitle(blocks: GeneratedBlock[]): RichText | null {
  for (const b of blocks) {
    if (b.kind === 'topics' || b.kind === 'steps') {
      if (b.items[0]) return b.items[0];
    } else if (b.kind === 'cards') {
      if (b.items[0]) return b.items[0].title;
    } else if (b.kind === 'stats') {
      if (b.items[0]) return b.items[0].label;
    } else if (b.kind === 'compare') {
      if (b.sides[0]) return b.sides[0].label;
    } else if (b.content.length > 0) {
      return b.content;
    }
  }
  return null;
}

/** Garante um title-2 âncora no slide de conteúdo: converte title-1/3, ou sintetiza. */
function ensureContentTitle(blocks: GeneratedBlock[]): GeneratedBlock[] {
  const idx = blocks.findIndex(
    (b): b is GeneratedTextBlock => TEXT_KINDS.has(b.kind) && CONTENT_TITLE_KINDS.has(b.kind),
  );
  if (idx >= 0) {
    const tb = blocks[idx] as GeneratedTextBlock;
    if (tb.kind === 'title-2') return blocks;
    const copy = blocks.slice();
    copy[idx] = { ...tb, kind: 'title-2' };
    return copy;
  }
  const borrowed = borrowTitle(blocks);
  if (!borrowed) return blocks;
  return [{ kind: 'title-2', content: borrowed }, ...blocks];
}

/** Menos itens que isto e a lista deixa de ser lista. A poda para aqui. */
const LIST_FLOOR: Record<string, number> = { topics: 2, cards: 2, steps: 3, stats: 1 };

/**
 * Aplica a gramática do formato a UM slide de conteúdo.
 *
 * 1. garante o título âncora;
 * 2. infere o formato pelos blocos presentes;
 * 3. derruba blocos fora da gramática (o primeiro de cada kind permitido fica);
 * 4. poda até a faixa do formato SEM nunca remover o bloco que o define e SEM
 *    encolher uma lista abaixo do piso dela — o slide sai enxuto, nunca oco.
 */
export function enforceFormat(slide: GeneratedSlide): GeneratedSlide {
  if (slide.layout !== 'content') return slide;
  const withTitle = ensureContentTitle(slide.blocks);
  const format = inferFormat(withTitle);
  const grammar = FORMAT_GRAMMAR[format];

  const out: GeneratedBlock[] = [];
  const taken = new Set<string>();
  for (const block of withTitle) {
    if (block.kind === 'title-2') {
      if (!taken.has('title-2')) {
        out.push(block);
        taken.add('title-2');
      }
      continue;
    }
    if (!grammar.allowed.has(block.kind)) continue;
    if (taken.has(block.kind)) continue; // um bloco de cada kind basta
    out.push(block);
    taken.add(block.kind);
  }
  if (out.length === 0) return slide; // segurança: nunca esvazia

  // Poda até o teto do formato, por prioridade: subtítulo -> item excedente da
  // lista (até o piso dela) -> body (se não for o defining). O defining nunca cai.
  let guard = 24;
  while (totalWords(out) > grammar.ceil && guard-- > 0) {
    const subIdx = out.findIndex((b) => b.kind === 'subtitle');
    if (subIdx >= 0) {
      out.splice(subIdx, 1);
      continue;
    }
    const listIdx = out.findIndex(
      (b) =>
        (b.kind === 'topics' || b.kind === 'cards' || b.kind === 'steps' || b.kind === 'stats') &&
        b.items.length > (LIST_FLOOR[b.kind] ?? 1),
    );
    if (listIdx >= 0) {
      const lb = out[listIdx] as GeneratedTopicsBlock | GeneratedCardsBlock | GeneratedStepsBlock | GeneratedStatsBlock;
      out[listIdx] = { ...lb, items: lb.items.slice(0, -1) } as GeneratedBlock;
      continue;
    }
    const compIdx = out.findIndex(
      (b): b is GeneratedCompareBlock => b.kind === 'compare' && b.sides.some((s) => s.points.length > 1),
    );
    if (compIdx >= 0) {
      const cb = out[compIdx] as GeneratedCompareBlock;
      out[compIdx] = {
        kind: 'compare',
        sides: cb.sides.map((s) => (s.points.length > 1 ? { ...s, points: s.points.slice(0, -1) } : s)),
      };
      continue;
    }
    const bodyIdx = out.findIndex((b) => b.kind === 'body' && grammar.defining !== 'body');
    if (bodyIdx >= 0) {
      out.splice(bodyIdx, 1);
      continue;
    }
    break; // sobrou o mínimo do formato
  }
  return { ...slide, blocks: out };
}

/* -------------------------------------------------------------------------- */
/* O QUEBRA-MONOTONIA                                                          */
/*                                                                             */
/* A variedade estrutural é pedida no prompt (o estrategista planeja formato a  */
/* formato), mas modelo nenhum obedece 100%. Quando dois slides de conteúdo     */
/* VIZINHOS saem com o mesmo formato, o segundo é convertido por uma            */
/* transformação que preserva 100% do texto — só o desenho muda:                */
/*                                                                             */
/*   topicos   -> jornada    (mesmos itens, vira timeline)                      */
/*   jornada   -> topicos    (o inverso)                                        */
/*   afirmacao -> citacao    (o subtitle vira highlight)                        */
/*   apoio     -> citacao    (body curto vira highlight)                        */
/*   cards(2)  -> comparacao (título do card vira o lado, corpo vira o ponto)   */
/*                                                                             */
/* Determinístico, sem sorteio: mesma entrada, mesma saída, em qualquer render. */
/* Sem conversão possível, fica como está (o log de variedade enxerga).         */
/* -------------------------------------------------------------------------- */

function convertForVariety(slide: GeneratedSlide, format: SlideFormat): GeneratedSlide | null {
  const blocks = slide.blocks;
  if (format === 'topicos') {
    const topics = blocks.find((b): b is GeneratedTopicsBlock => b.kind === 'topics');
    if (!topics || topics.items.length < 3) return null; // timeline de 2 etapas não conta uma jornada
    return {
      ...slide,
      blocks: blocks.map((b) => (b === topics ? { kind: 'steps', items: topics.items } : b)),
    };
  }
  if (format === 'jornada') {
    const steps = blocks.find((b): b is GeneratedStepsBlock => b.kind === 'steps');
    if (!steps) return null;
    return {
      ...slide,
      blocks: blocks.map((b) => (b === steps ? { kind: 'topics', items: steps.items } : b)),
    };
  }
  if (format === 'afirmacao') {
    const subtitle = blocks.find((b): b is GeneratedTextBlock => b.kind === 'subtitle');
    if (!subtitle) return null;
    return {
      ...slide,
      blocks: blocks.map((b) => (b === subtitle ? { ...subtitle, kind: 'highlight' } : b)),
    };
  }
  if (format === 'apoio') {
    const body = blocks.find((b): b is GeneratedTextBlock => b.kind === 'body');
    if (!body || wordsIn(body.content) > 14) return null; // highlight tem que caber como síntese
    return {
      ...slide,
      blocks: blocks.filter((b) => b.kind !== 'subtitle').map((b) => (b === body ? { ...body, kind: 'highlight' } : b)),
    };
  }
  if (format === 'cards') {
    const cards = blocks.find((b): b is GeneratedCardsBlock => b.kind === 'cards');
    if (!cards || cards.items.length !== 2) return null; // só 2 cards viram um confronto honesto
    const sides: GeneratedCompareSide[] = cards.items.map((card) => ({
      label: trimRichToWords(card.title, 5),
      points: [card.body],
      ...(card.icon ? { icon: card.icon } : {}),
    }));
    return {
      ...slide,
      blocks: blocks.map((b) => (b === cards ? { kind: 'compare', sides } : b)),
    };
  }
  return null;
}

/** Converte o segundo de cada par de vizinhos com o mesmo formato. */
function dejavuBreaker(slides: GeneratedSlide[]): GeneratedSlide[] {
  const out = slides.slice();
  let prevFormat: SlideFormat | null = null;
  for (let i = 0; i < out.length; i++) {
    const slide = out[i]!;
    if (slide.layout !== 'content') {
      prevFormat = null;
      continue;
    }
    let format = inferFormat(slide.blocks);
    if (format === prevFormat) {
      const converted = convertForVariety(slide, format);
      if (converted) {
        out[i] = converted;
        format = inferFormat(converted.blocks);
      }
    }
    prevFormat = format;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Respostas                                                                   */
/* -------------------------------------------------------------------------- */

/** Título vindo do modelo: sanitizado, limitado a 60 caracteres, primeira letra maiúscula. */
function normalizeTitle(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const clean = sanitizeText(raw).replace(/["“”]/g, '').trim().slice(0, 60).trim();
  if (clean.length === 0) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function normalizeGenerateResponse(raw: unknown): {
  title: string;
  slides: GeneratedSlide[];
  chat: string[];
} {
  const rawSlides = (raw as Record<string, unknown> | undefined)?.['slides'];
  const rawChat = (raw as Record<string, unknown> | undefined)?.['chat'];
  const title = normalizeTitle((raw as Record<string, unknown> | undefined)?.['title']);
  const parsed = Array.isArray(rawSlides)
    ? rawSlides.map(normalizeSlide).filter((s): s is GeneratedSlide => s !== null)
    : [];
  // A gramática do FORMATO modela cada slide de conteúdo (capa/separador/fecho já
  // saíram do normalizeSlide com o teto por bloco aplicado), e o quebra-monotonia
  // garante que dois vizinhos não repitam o desenho.
  const slides = dejavuBreaker(parsed.map(enforceFormat));
  const chat = Array.isArray(rawChat)
    ? rawChat
        .filter((c): c is string => typeof c === 'string')
        .map(sanitizeText)
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    : [];
  return { title, slides, chat };
}

export function normalizeImproveResponse(raw: unknown): { blocks: GeneratedBlock[] } {
  const rawBlocks = (raw as Record<string, unknown> | undefined)?.['blocks'];
  const blocks = Array.isArray(rawBlocks)
    ? rawBlocks.map(normalizeBlock).filter((b): b is GeneratedBlock => b !== null)
    : [];
  const kept = dedupeLists(blocks).map(capBlockWords);
  capHighlights(kept);
  // "Melhorar slide" só roda em slide de conteúdo, então a mesma gramática de
  // formato vale aqui: sem isto, editar um slide voltava sem a régua de densidade.
  if (kept.length > 0) {
    return { blocks: enforceFormat({ layout: 'content', blocks: kept }).blocks };
  }
  return { blocks: kept };
}

/* -------------------------------------------------------------------------- */
/* Auditoria de densidade                                                      */
/* -------------------------------------------------------------------------- */

/** Quantas palavras este slide de fato entrega. O telão não é documento. */
export function slideWordCount(slide: GeneratedSlide): number {
  return totalWords(slide.blocks);
}

/**
 * Slides de conteúdo FORA DA FAIXA DO PRÓPRIO FORMATO, pra o log.
 *
 * NÃO conserta: o enforceFormat já garantiu teto e gramática; o que sobra fora da
 * faixa é sinal de prompt escorregando (ex: um formato saindo sistematicamente no
 * piso). Serve pra gente enxergar os DOIS extremos por formato, não por um número
 * global que trata afirmação e split com a mesma régua.
 */
export function offBandContentSlides(slides: GeneratedSlide[]): { shallow: number[]; heavy: number[] } {
  const shallow: number[] = [];
  const heavy: number[] = [];
  slides.forEach((slide, index) => {
    if (slide.layout !== 'content') return;
    const format = inferFormat(slide.blocks);
    const { floor, ceil } = FORMAT_GRAMMAR[format];
    const words = slideWordCount(slide);
    if (words < floor) shallow.push(index + 1);
    else if (words > ceil) heavy.push(index + 1);
  });
  return { shallow, heavy };
}

/** Assinatura de formatos do deck (pro log de variedade da rota de geração). */
export function deckFormatSignature(slides: GeneratedSlide[]): string[] {
  return slides.map((s) => (s.layout === 'content' ? inferFormat(s.blocks) : s.layout));
}
