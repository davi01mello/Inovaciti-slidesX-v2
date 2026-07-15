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
import type {
  GeneratedBlock,
  GeneratedCard,
  GeneratedCardsBlock,
  GeneratedSlide,
  GeneratedTextBlock,
  GeneratedTopicsBlock,
  RichRun,
  RichText,
  VisualStyle,
} from './types.js';

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

/**
 * O DESTAQUE, CORTADO NO SERVIDOR. Camada 2 da regra "seja cirúrgico".
 *
 * O prompt pede no máximo UM trecho marcado por slide, de 1 a 3 palavras. Mas modelo
 * nenhum obedece 100%: às vezes ele pinta uma frase inteira de verde, ou marca três
 * coisas no mesmo slide. Texto grande verde é exatamente o defeito que aparece na
 * frente do cliente. Então aqui o servidor GARANTE: some o destaque longo (mais de 3
 * palavras) e só o PRIMEIRO destaque curto do slide sobrevive, o resto é desmarcado.
 */
const HIGHLIGHT_MAX_WORDS = 3;

function wordsOf(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Percorre todo texto rico do slide e mantém, no máximo, um único destaque curto. */
function capHighlights(blocks: GeneratedBlock[]): void {
  let used = false;
  const visit = (rich: RichText) => {
    for (const run of rich) {
      if (!run.highlight) continue;
      // Trecho longo nunca é destaque legítimo: some. Curto sobrevive só se for o
      // primeiro do slide; do segundo em diante, desmarca.
      if (used || wordsOf(run.text) > HIGHLIGHT_MAX_WORDS) {
        delete run.highlight;
      } else {
        used = true;
      }
    }
  };
  for (const block of blocks) {
    if (block.kind === 'cards') {
      for (const card of block.items) {
        visit(card.title);
        visit(card.body);
      }
    } else if (block.kind === 'topics') {
      for (const item of block.items) visit(item);
    } else {
      visit(block.content);
    }
  }
}

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
  const kept = dedupeLists(blocks);
  capHighlights(kept);
  return { layout: layout as GeneratedSlide['layout'], blocks: kept };
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

/* -------------------------------------------------------------------------- */
/* A VOZ MODELA A ESTRUTURA DO SLIDE, não só a redação.                         */
/*                                                                             */
/* Trocar a Voz não mudava nada e todo slide vinha com texto demais porque a    */
/* diferença entre as vozes morava só em faixas de palavras (8-24 vs 15-38) que */
/* o modelo ignora, sem nada proibindo estruturalmente um bloco pesado. Aqui a  */
/* identidade de cada voz vira uma GRAMÁTICA DE BLOCOS do slide de CONTEÚDO, e o */
/* servidor GARANTE (o prompt só pede; modelo não obedece 100%):                */
/*                                                                             */
/*   Sereno   (minimal)  só título + subtítulo curto opcional. Nunca lista,     */
/*                       nunca body, nunca destaque. Muitos slides só o título. */
/*   Preciso  (balanced) a ÚNICA voz que enumera: título + UMA lista (tópicos   */
/*                       OU cards) OU um body curto, + subtítulo curto opcional. */
/*   Presença (bold)     manchete: título + no máximo UM acento (destaque OU    */
/*                       rótulo), nunca lista, nunca body.                       */
/*                                                                             */
/* Só age em slides "content": capa/separador/encerramento mantêm a receita     */
/* deles (a Voz só afina a redação). Estilo desconhecido cai nos limites globais.*/
/* Nunca corta no meio da frase: descarta blocos/itens inteiros por prioridade, */
/* e o título nunca cai. Se o slide vier sem título, um é sintetizado do melhor  */
/* conteúdo, pra nunca esvaziar o slide.                                         */
/* -------------------------------------------------------------------------- */

// Tetos de palavras por voz (enxutos de propósito; um pouco de folga pra não
// apagar um subtítulo legítimo por causa de uma palavra a mais).
const SERENO_CEIL = 13;
const PRESENCA_CEIL = 13;
const PRECISO_CEIL = 28;
const PRECISO_TOPICS = 3;
const PRECISO_CARDS = 2;

const CONTENT_TITLE_KINDS = new Set(['title-1', 'title-2', 'title-3']);

/** Palavras de um bloco qualquer (texto, cards ou tópicos). */
function blockWords(block: GeneratedBlock): number {
  if (block.kind === 'cards') return block.items.reduce((n, c) => n + wordsIn(c.title) + wordsIn(c.body), 0);
  if (block.kind === 'topics') return block.items.reduce((n, t) => n + wordsIn(t), 0);
  return wordsIn(block.content);
}

function totalWords(blocks: GeneratedBlock[]): number {
  return blocks.reduce((n, b) => n + blockWords(b), 0);
}

/** A melhor fonte de texto pra virar título quando o slide de conteúdo veio sem um. */
function borrowTitle(blocks: GeneratedBlock[]): RichText | null {
  for (const b of blocks) {
    if (b.kind === 'topics') {
      if (b.items[0]) return b.items[0];
    } else if (b.kind === 'cards') {
      if (b.items[0]) return b.items[0].title;
    } else if (b.content.length > 0) {
      return b.content;
    }
  }
  return null;
}

/** Garante um title-2 âncora no slide de conteúdo: converte title-1/3, ou sintetiza. */
function ensureContentTitle(blocks: GeneratedBlock[]): GeneratedBlock[] {
  const idx = blocks.findIndex(
    (b) => b.kind !== 'cards' && b.kind !== 'topics' && CONTENT_TITLE_KINDS.has(b.kind),
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

function splitTitle(blocks: GeneratedBlock[]): { title: GeneratedBlock | null; rest: GeneratedBlock[] } {
  const idx = blocks.findIndex((b) => b.kind === 'title-2');
  if (idx < 0) return { title: null, rest: blocks };
  return { title: blocks[idx]!, rest: blocks.filter((_, i) => i !== idx) };
}

/** Sereno: título + no máximo um subtítulo curto. Nada mais. */
function enforceSereno(blocks: GeneratedBlock[]): GeneratedBlock[] {
  const { title, rest } = splitTitle(blocks);
  if (!title) return blocks;
  const subtitle = rest.find((b) => b.kind === 'subtitle') ?? null;
  let out: GeneratedBlock[] = subtitle ? [title, subtitle] : [title];
  if (out.length > 1 && totalWords(out) > SERENO_CEIL) out = [title];
  return out;
}

/** Presença: título manchete + no máximo UM acento (destaque OU rótulo curto). */
function enforcePresenca(blocks: GeneratedBlock[]): GeneratedBlock[] {
  const { title, rest } = splitTitle(blocks);
  if (!title) return blocks;
  const accent =
    rest.find((b) => (b.kind === 'highlight' || b.kind === 'section-label') && blockWords(b) <= 3) ?? null;
  let out: GeneratedBlock[] = accent ? [title, accent] : [title];
  if (out.length > 1 && totalWords(out) > PRESENCA_CEIL) out = [title];
  return out;
}

/** Preciso: a única voz que enumera. Título + UMA lista OU body, + subtítulo opcional. */
function enforcePreciso(blocks: GeneratedBlock[]): GeneratedBlock[] {
  const { title, rest } = splitTitle(blocks);
  if (!title) return blocks;
  const subtitle = rest.find((b) => b.kind === 'subtitle') ?? null;
  const cards = rest.find((b): b is GeneratedCardsBlock => b.kind === 'cards') ?? null;
  const topics = rest.find((b): b is GeneratedTopicsBlock => b.kind === 'topics') ?? null;
  const body = rest.find((b) => b.kind === 'body') ?? null;

  // Uma lista só (cards têm preferência, como no dedupeLists), com teto de itens.
  let list: GeneratedBlock | null = null;
  if (cards) list = { kind: 'cards', items: cards.items.slice(0, PRECISO_CARDS) };
  else if (topics) list = { kind: 'topics', items: topics.items.slice(0, PRECISO_TOPICS) };

  const out: GeneratedBlock[] = [title];
  if (subtitle) out.push(subtitle);
  if (list) out.push(list);
  else if (body) out.push(body); // body só quando não há lista

  // Teto de palavras: remove por prioridade (subtítulo, item da lista, body), título nunca.
  while (totalWords(out) > PRECISO_CEIL && out.length > 1) {
    const subIdx = out.findIndex((b) => b.kind === 'subtitle');
    if (subIdx >= 0) {
      out.splice(subIdx, 1);
      continue;
    }
    const listIdx = out.findIndex((b) => b.kind === 'topics' || b.kind === 'cards');
    if (listIdx >= 0) {
      const lb = out[listIdx]!;
      if (lb.kind === 'topics' && lb.items.length > 1) {
        out[listIdx] = { kind: 'topics', items: lb.items.slice(0, -1) };
        continue;
      }
      if (lb.kind === 'cards' && lb.items.length > 1) {
        out[listIdx] = { kind: 'cards', items: lb.items.slice(0, -1) };
        continue;
      }
    }
    const bodyIdx = out.findIndex((b) => b.kind === 'body');
    if (bodyIdx >= 0) {
      out.splice(bodyIdx, 1);
      continue;
    }
    break; // sobrou o mínimo (título + um item)
  }
  return out;
}

/**
 * Aplica a gramática de blocos da voz a UM slide. Só age em slides de conteúdo;
 * capa/separador/encerramento passam intactos.
 */
export function enforceVoice(slide: GeneratedSlide, style: VisualStyle): GeneratedSlide {
  if (slide.layout !== 'content') return slide;
  const withTitle = ensureContentTitle(slide.blocks);
  let blocks: GeneratedBlock[];
  if (style === 'minimal') blocks = enforceSereno(withTitle);
  else if (style === 'balanced') blocks = enforcePreciso(withTitle);
  else blocks = enforcePresenca(withTitle);
  if (blocks.length === 0) return slide; // segurança: nunca esvazia
  return { ...slide, blocks };
}

/** Título vindo do modelo: sanitizado, limitado a 60 caracteres, primeira letra maiúscula. */
function normalizeTitle(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const clean = sanitizeText(raw).replace(/["“”]/g, '').trim().slice(0, 60).trim();
  if (clean.length === 0) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function normalizeGenerateResponse(
  raw: unknown,
  style?: VisualStyle,
): {
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
  // A Voz modela a estrutura de cada slide de conteúdo (ver enforceVoice). Sem
  // style informado, cai só nos limites globais já aplicados no normalizeSlide.
  const slides = style ? parsed.map((s) => enforceVoice(s, style)) : parsed;
  const chat = Array.isArray(rawChat)
    ? rawChat
        .filter((c): c is string => typeof c === 'string')
        .map(sanitizeText)
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    : [];
  return { title, slides, chat };
}

export function normalizeImproveResponse(raw: unknown, style?: VisualStyle): { blocks: GeneratedBlock[] } {
  const rawBlocks = (raw as Record<string, unknown> | undefined)?.['blocks'];
  const blocks = Array.isArray(rawBlocks)
    ? rawBlocks.map(normalizeBlock).filter((b): b is GeneratedBlock => b !== null)
    : [];
  const kept = dedupeLists(blocks);
  capHighlights(kept);
  // "Melhorar slide" só roda em slide de conteúdo, então a mesma gramática de voz
  // vale aqui: sem isto, editar um slide voltava com a densidade da voz ignorada.
  if (style && kept.length > 0) {
    return { blocks: enforceVoice({ layout: 'content', blocks: kept }, style).blocks };
  }
  return { blocks: kept };
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

/** Quantas palavras este slide de fato entrega. MENOS É MAIS: o telão não é documento. */
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
 * Slides de conteúdo FORA DA FAIXA, pra o log.
 *
 * NÃO conserta: reescrever o slide do usuário seria mexer no conteúdo dele. Serve
 * pra a gente enxergar, no log, os DOIS extremos: um slide literalmente sem texto
 * (abaixo do piso) ou uma parede de texto (acima do teto). Slide enxuto com título
 * forte e pouquíssimo apoio é saudável e NÃO cai aqui: menos é mais.
 */
const CONTENT_FLOOR = 3;
const CONTENT_CEIL = 34;

export function offBandContentSlides(slides: GeneratedSlide[]): { shallow: number[]; heavy: number[] } {
  const shallow: number[] = [];
  const heavy: number[] = [];
  slides.forEach((slide, index) => {
    if (slide.layout !== 'content') return;
    const words = slideWordCount(slide);
    if (words < CONTENT_FLOOR) shallow.push(index + 1);
    else if (words > CONTENT_CEIL) heavy.push(index + 1);
  });
  return { shallow, heavy };
}
