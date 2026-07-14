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
 */
import { MAX_CARDS, MAX_TOPICS } from './types.js';
import type { GeneratedBlock, GeneratedCard, GeneratedSlide, RichRun, RichText } from './types.js';

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

function normalizeAlign(value: unknown): GeneratedBlock['align'] {
  return typeof value === 'string' && ALIGNS.has(value)
    ? (value as Exclude<GeneratedBlock['align'], undefined>)
    : undefined;
}

/** Um card SÓ é card se tiver título E corpo. Sem corpo é um tópico disfarçado: cai fora. */
function normalizeCard(raw: unknown): GeneratedCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const title = normalizeRichText((raw as Record<string, unknown>)['title']);
  const body = normalizeRichText((raw as Record<string, unknown>)['body']);
  if (title.length === 0 || body.length === 0) return null;
  return { title, body };
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

  if (typeof kind === 'string' && TEXT_KINDS.has(kind)) {
    const content = normalizeRichText(record['content']);
    if (content.length === 0) return null;
    return {
      kind: kind as Exclude<GeneratedBlock, { kind: 'cards' } | { kind: 'topics' }>['kind'],
      align: normalizeAlign(record['align']),
      content,
    };
  }

  return null;
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
  return { layout: layout as GeneratedSlide['layout'], blocks: dedupeLists(blocks) };
}

/**
 * UMA lista por slide, e nunca as duas.
 *
 * Cards e tópicos no mesmo slide é a receita do slide poluído: duas hierarquias
 * visuais brigando pelo mesmo olhar. O prompt proíbe, mas o modelo às vezes manda
 * os dois "pra enriquecer". Fica a primeira lista, cai o resto — e a preferência é
 * pelos cards, que carregam conteúdo com corpo (tópico o slide sobrevive sem).
 */
function dedupeLists(blocks: GeneratedBlock[]): GeneratedBlock[] {
  const lists = blocks.filter((b) => b.kind === 'cards' || b.kind === 'topics');
  if (lists.length <= 1) return blocks;
  const keep = lists.find((b) => b.kind === 'cards') ?? lists[0];
  return blocks.filter((b) => (b.kind === 'cards' || b.kind === 'topics' ? b === keep : true));
}

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
  const slides = Array.isArray(rawSlides)
    ? rawSlides.map(normalizeSlide).filter((s): s is GeneratedSlide => s !== null)
    : [];
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
  return { blocks: dedupeLists(blocks) };
}

/* -------------------------------------------------------------------------- */
/* Auditoria de densidade                                                      */
/* -------------------------------------------------------------------------- */

function wordsIn(rich: RichText): number {
  return rich
    .map((r) => r.text)
    .join('')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Quantas palavras este slide de fato entrega. SLIDE É DOCUMENTO, NÃO CARTAZ. */
export function slideWordCount(slide: GeneratedSlide): number {
  let total = 0;
  for (const block of slide.blocks) {
    if (block.kind === 'cards') {
      for (const card of block.items) total += wordsIn(card.title) + wordsIn(card.body);
    } else if (block.kind === 'topics') {
      for (const item of block.items) total += wordsIn(item);
    } else {
      total += wordsIn(block.content);
    }
  }
  return total;
}

/**
 * Slides de conteúdo rasos, pra o log.
 *
 * NÃO conserta: inventar parágrafo pro slide do usuário seria inventar fato, e o
 * sistema não faz isso. Serve pra a gente ver, no log, quando o prompt está
 * deixando passar slide raso — que é defeito, não estilo.
 */
export function shallowContentSlides(slides: GeneratedSlide[], floor = 60): number[] {
  return slides
    .map((slide, index) => ({ slide, index }))
    .filter(({ slide }) => slide.layout === 'content' && slideWordCount(slide) < floor)
    .map(({ index }) => index + 1);
}
