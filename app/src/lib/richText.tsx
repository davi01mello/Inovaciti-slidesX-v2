/**
 * RichText: a small, safe rich text model.
 *
 * We deliberately avoid HTML-string storage + dangerouslySetInnerHTML.
 * Instead everything is stored as an array of runs, and rendering / parsing is done
 * through explicit React nodes and DOM walking — so nothing hostile can slip through.
 *
 * Marks supported (matches the CITi Slides design rules — always a fixed set, never
 * arbitrary user input, so a slide never drifts off-brand):
 *   - bold
 *   - highlight (verde CITi — o destaque histórico, mantido por compatibilidade)
 *   - color: uma paleta fixa da marca (ver TEXT_COLOR_PALETTE)
 *   - fontFamily: um conjunto fixo de fontes (ver FONT_FAMILY_OPTIONS)
 *   - size: uma escala relativa fixa (ver FONT_SIZE_SCALE), nunca um px livre
 *
 * Text is stored as plain UTF-8 characters. No <img>, no <a>, no <script>, no free attributes.
 */

import type { ReactNode } from 'react';

export type TextColorKey = 'default' | 'white' | 'gray' | 'green';
export type FontFamilyKey = 'sora' | 'inter' | 'poppins' | 'space-grotesk' | 'manrope' | 'outfit';
export type FontSizeKey = 'sm' | 'md' | 'lg' | 'xl';

/** Paleta fixa — as únicas cores que um trecho de texto pode assumir. */
export const TEXT_COLOR_PALETTE: Record<Exclude<TextColorKey, 'default'>, string> = {
  white: '#F7F7F7',
  gray: 'rgba(247,247,247,0.62)',
  green: 'var(--color-slide-hl)',
};

/** Fontes oferecidas no editor — Sora/Inter são as da marca; as demais foram
 * adicionadas pra aproximar o visual das artes premium geradas por IA no passado
 * (geométricas, bold, com mais personalidade que o padrão do app). */
export const FONT_FAMILY_OPTIONS: Record<FontFamilyKey, { label: string; stack: string }> = {
  sora: { label: 'Sora', stack: '"Sora Variable", "Sora", system-ui, sans-serif' },
  inter: { label: 'Inter', stack: '"Inter Variable", "Inter", system-ui, sans-serif' },
  poppins: { label: 'Poppins', stack: '"Poppins", system-ui, sans-serif' },
  'space-grotesk': { label: 'Space Grotesk', stack: '"Space Grotesk Variable", "Space Grotesk", system-ui, sans-serif' },
  manrope: { label: 'Manrope', stack: '"Manrope Variable", "Manrope", system-ui, sans-serif' },
  outfit: { label: 'Outfit', stack: '"Outfit Variable", "Outfit", system-ui, sans-serif' },
};

/** Escala relativa (em `em`, sobre o tamanho já responsivo do bloco) — nunca um px fixo. */
export const FONT_SIZE_SCALE: Record<FontSizeKey, { label: string; em: number }> = {
  sm: { label: 'P', em: 0.72 },
  md: { label: 'M', em: 1 },
  lg: { label: 'G', em: 1.35 },
  xl: { label: 'GG', em: 1.75 },
};

export interface RichRun {
  text: string;
  bold?: boolean;
  highlight?: boolean;
  color?: TextColorKey;
  fontFamily?: FontFamilyKey;
  size?: FontSizeKey;
}

export type RichText = RichRun[];

export function fromPlain(text: string): RichText {
  if (!text) return [];
  return [{ text }];
}

export function toPlain(rich: RichText): string {
  return rich.map((r) => r.text).join('');
}

export function isEmpty(rich: RichText): boolean {
  return rich.every((r) => r.text.length === 0);
}

const VALID_COLORS = new Set<TextColorKey>(['default', 'white', 'gray', 'green']);
const VALID_FONTS = new Set<FontFamilyKey>(['sora', 'inter', 'poppins', 'space-grotesk', 'manrope', 'outfit']);
const VALID_SIZES = new Set<FontSizeKey>(['sm', 'md', 'lg', 'xl']);

/**
 * Parse a contenteditable subtree back into RichText.
 * Walks the DOM tree, respects nested <b>/<strong>/<span data-hl>/<mark>, além dos
 * atributos data-color / data-font / data-size aplicados pelo toolbar.
 * Everything else is treated as plain text — atributos e tags desconhecidos são descartados.
 */
export function fromDom(root: Node): RichText {
  const runs: RichText = [];
  walk(root, { bold: false, highlight: false, color: undefined, fontFamily: undefined, size: undefined }, runs);
  return mergeRuns(runs);
}

interface WalkFormat {
  bold: boolean;
  highlight: boolean;
  color?: TextColorKey;
  fontFamily?: FontFamilyKey;
  size?: FontSizeKey;
}

function walk(node: Node, fmt: WalkFormat, out: RichText): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue ?? '';
    if (text.length === 0) return;
    const run: RichRun = { text };
    if (fmt.bold) run.bold = true;
    if (fmt.highlight) run.highlight = true;
    if (fmt.color) run.color = fmt.color;
    if (fmt.fontFamily) run.fontFamily = fmt.fontFamily;
    if (fmt.size) run.size = fmt.size;
    out.push(run);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === 'br') {
    out.push({ text: '\n' });
    return;
  }

  let nextFmt = fmt;
  if (tag === 'b' || tag === 'strong') {
    nextFmt = { ...nextFmt, bold: true };
  } else if (tag === 'mark' || el.dataset['hl'] === '1') {
    nextFmt = { ...nextFmt, highlight: true };
  }
  // Os valores-sentinela de reset ('default', '', 'md') precisam LIMPAR o que
  // veio de um span ancestral — sem isso, resetar cor/fonte/tamanho de um trecho
  // já marcado não tinha efeito nenhum no modelo.
  const dataColor = el.dataset['color'];
  if (dataColor !== undefined) {
    if (dataColor === 'default') nextFmt = { ...nextFmt, color: undefined };
    else if (VALID_COLORS.has(dataColor as TextColorKey)) nextFmt = { ...nextFmt, color: dataColor as TextColorKey };
  }
  const dataFont = el.dataset['font'];
  if (dataFont !== undefined) {
    if (dataFont === '') nextFmt = { ...nextFmt, fontFamily: undefined };
    else if (VALID_FONTS.has(dataFont as FontFamilyKey)) nextFmt = { ...nextFmt, fontFamily: dataFont as FontFamilyKey };
  }
  const dataSize = el.dataset['size'];
  if (dataSize !== undefined) {
    if (dataSize === 'md') nextFmt = { ...nextFmt, size: undefined };
    else if (VALID_SIZES.has(dataSize as FontSizeKey)) nextFmt = { ...nextFmt, size: dataSize as FontSizeKey };
  }

  el.childNodes.forEach((child) => walk(child, nextFmt, out));
}

function sameFormat(a: RichRun, b: RichRun): boolean {
  return (
    !!a.bold === !!b.bold &&
    !!a.highlight === !!b.highlight &&
    a.color === b.color &&
    a.fontFamily === b.fontFamily &&
    a.size === b.size
  );
}

function mergeRuns(runs: RichText): RichText {
  const out: RichText = [];
  for (const run of runs) {
    if (run.text.length === 0) continue;
    const last = out[out.length - 1];
    if (last && sameFormat(last, run)) {
      last.text += run.text;
    } else {
      out.push({ ...run });
    }
  }
  return out;
}

/** Resolve a cor efetiva de um run: highlight sempre vence (compatibilidade histórica),
 * depois a cor escolhida na paleta, senão herda do bloco. */
export function resolveRunColor(run: RichRun): string | undefined {
  if (run.highlight) return 'var(--color-slide-hl)';
  if (run.color && run.color !== 'default') return TEXT_COLOR_PALETTE[run.color];
  return undefined;
}

function runStyle(run: RichRun): Record<string, string> {
  const style: Record<string, string> = {};
  const color = resolveRunColor(run);
  if (color) style.color = color;
  if (run.fontFamily) style.fontFamily = FONT_FAMILY_OPTIONS[run.fontFamily].stack;
  if (run.size && run.size !== 'md') style.fontSize = `${FONT_SIZE_SCALE[run.size].em}em`;
  return style;
}

export interface MarkAttrs {
  color?: TextColorKey;
  fontFamily?: FontFamilyKey;
  size?: FontSizeKey;
}

/**
 * Apply color/fontFamily/size to the current selection by wrapping it in a
 * <span data-color/data-font/data-size>. We don't use execCommand here — it
 * produces <font> tags that don't map onto our fixed mark set, and its behavior
 * for font-name/size is inconsistent across browsers. Range.extractContents +
 * insertNode handles partial, multi-node selections safely.
 *
 * O span recebe também o ESTILO INLINE correspondente: é o que faz a mudança
 * aparecer NA HORA dentro do contenteditable vivo (o React só re-renderiza os
 * runs no blur; sem o estilo, a formatação só aparecia ao desmarcar o texto).
 *
 * Any attrs left undefined are NOT touched (existing values inside the selection
 * are preserved via nested elements, per the cascading rule in `walk`). To reset
 * an attribute back to "inherit/default", pass its key via `resetKeys` —
 * `inheritColor` dá a cor visual do reset (a cor base computada do bloco).
 */
export function applyMarkToSelection(
  attrs: MarkAttrs,
  resetKeys: (keyof MarkAttrs)[] = [],
  opts: { inheritColor?: string } = {},
): boolean {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);

  const span = document.createElement('span');
  if (attrs.color && attrs.color !== 'default') {
    span.dataset['color'] = attrs.color;
    span.style.color = TEXT_COLOR_PALETTE[attrs.color];
  }
  if (attrs.fontFamily) {
    span.dataset['font'] = attrs.fontFamily;
    span.style.fontFamily = FONT_FAMILY_OPTIONS[attrs.fontFamily].stack;
  }
  if (attrs.size && attrs.size !== 'md') {
    span.dataset['size'] = attrs.size;
    span.style.fontSize = `${FONT_SIZE_SCALE[attrs.size].em}em`;
  }
  for (const key of resetKeys) {
    if (key === 'color') {
      span.dataset['color'] = 'default';
      if (opts.inheritColor) span.style.color = opts.inheritColor;
    }
    if (key === 'fontFamily') span.dataset['font'] = '';
    if (key === 'size') span.dataset['size'] = 'md';
  }

  const contents = range.extractContents();
  // Marcas antigas do mesmo atributo dentro da seleção venceriam o span novo
  // (aninhamento mais profundo ganha, no CSS e no walk): remove estilo E data-*
  // dos descendentes pro valor recém-aplicado valer de ponta a ponta.
  const fragment = document.createElement('span');
  fragment.appendChild(contents);
  const clearMark = (cssProp: string, dataKey: string) => {
    fragment.querySelectorAll<HTMLElement>(`[style], [data-${dataKey}]`).forEach((el) => {
      el.style.removeProperty(cssProp);
      delete el.dataset[dataKey];
    });
  };
  if (attrs.color || resetKeys.includes('color')) clearMark('color', 'color');
  if (attrs.fontFamily || resetKeys.includes('fontFamily')) clearMark('font-family', 'font');
  if (attrs.size || resetKeys.includes('size')) clearMark('font-size', 'size');
  while (fragment.firstChild) span.appendChild(fragment.firstChild);
  range.insertNode(span);

  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(newRange);
  return true;
}

/** Render RichText as safe React children. Never uses HTML strings. */
export function renderRich(rich: RichText): ReactNode[] {
  return rich.map((run, index) => {
    const key = index;
    const parts = run.text.split('\n');
    const inner: ReactNode[] = [];
    parts.forEach((part, i) => {
      if (i > 0) inner.push(<br key={`br-${index}-${i}`} />);
      if (part) inner.push(part);
    });

    const style = runStyle(run);
    const hasStyle = Object.keys(style).length > 0;
    const dataHl = run.highlight ? '1' : undefined;
    const dataColor = run.color && run.color !== 'default' ? run.color : undefined;
    const dataFont = run.fontFamily;
    const dataSize = run.size && run.size !== 'md' ? run.size : undefined;

    if (run.bold) {
      return (
        <b
          key={key}
          data-hl={dataHl}
          data-color={dataColor}
          data-font={dataFont}
          data-size={dataSize}
          className="font-semibold"
          style={hasStyle ? style : undefined}
        >
          {inner}
        </b>
      );
    }
    if (hasStyle || dataHl || dataColor || dataFont || dataSize) {
      return (
        <span key={key} data-hl={dataHl} data-color={dataColor} data-font={dataFont} data-size={dataSize} style={style}>
          {inner}
        </span>
      );
    }
    return <span key={key}>{inner}</span>;
  });
}
