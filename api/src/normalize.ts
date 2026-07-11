/**
 * Sanitiza a saída "crua" do Gemini antes de devolver pro front. O modelo pode alucinar campos
 * (ex: bullets sem "items", "kind" fora do enum) mesmo com responseSchema — aqui a gente descarta
 * o que não bate com o contrato em vez de deixar o front quebrar.
 */
import type { GeneratedBlock, GeneratedSlide, RichRun, RichText } from './types.js';

const TEXT_KINDS = new Set<GeneratedBlock['kind']>([
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
  return typeof value === 'string' && ALIGNS.has(value) ? (value as GeneratedBlock['align']) : undefined;
}

export function normalizeBlock(raw: unknown): GeneratedBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind = (raw as Record<string, unknown>)['kind'];
  const align = normalizeAlign((raw as Record<string, unknown>)['align']);

  if (kind === 'bullets') {
    const rawItems = (raw as Record<string, unknown>)['items'];
    const items = Array.isArray(rawItems)
      ? rawItems.map(normalizeRichText).filter((rt) => rt.length > 0)
      : [];
    if (items.length === 0) return null;
    return { kind: 'bullets', align, items };
  }

  if (typeof kind === 'string' && TEXT_KINDS.has(kind as GeneratedBlock['kind'])) {
    const content = normalizeRichText((raw as Record<string, unknown>)['content']);
    if (content.length === 0) return null;
    return { kind: kind as GeneratedBlock['kind'], align, content } as GeneratedBlock;
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
  return { layout: layout as GeneratedSlide['layout'], blocks };
}

/** Título vindo do modelo: sanitizado, limitado a 60 caracteres, primeira letra maiúscula. */
function normalizeTitle(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const clean = sanitizeText(raw).replace(/["""]/g, '').trim().slice(0, 60).trim();
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
  return { blocks };
}
