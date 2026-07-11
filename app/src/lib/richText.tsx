/**
 * RichText: a small, safe rich text model.
 *
 * We deliberately avoid HTML-string storage + dangerouslySetInnerHTML.
 * Instead everything is stored as an array of runs, and rendering / parsing is done
 * through explicit React nodes and DOM walking — so nothing hostile can slip through.
 *
 * Only two inline marks are supported (matches the CITi Slides color rules):
 *   - bold
 *   - highlight (rendered in the green accent color)
 *
 * Text is stored as plain UTF-8 characters. No <img>, no <a>, no <script>, no attributes.
 */

import type { ReactNode } from 'react';

export interface RichRun {
  text: string;
  bold?: boolean;
  highlight?: boolean;
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

/**
 * Parse a contenteditable subtree back into RichText.
 * Walks the DOM tree, respects nested <b>/<strong>/<span data-hl>/<mark>.
 * Everything else is treated as plain text — attributes and unknown tags are dropped.
 */
export function fromDom(root: Node): RichText {
  const runs: RichText = [];
  walk(root, { bold: false, highlight: false }, runs);
  return mergeRuns(runs);
}

interface WalkFormat {
  bold: boolean;
  highlight: boolean;
}

function walk(node: Node, fmt: WalkFormat, out: RichText): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue ?? '';
    if (text.length === 0) return;
    const run: RichRun = { text };
    if (fmt.bold) run.bold = true;
    if (fmt.highlight) run.highlight = true;
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
    nextFmt = { ...fmt, bold: true };
  } else if (tag === 'mark' || el.dataset['hl'] === '1') {
    nextFmt = { ...fmt, highlight: true };
  }

  el.childNodes.forEach((child) => walk(child, nextFmt, out));
}

function mergeRuns(runs: RichText): RichText {
  const out: RichText = [];
  for (const run of runs) {
    if (run.text.length === 0) continue;
    const last = out[out.length - 1];
    if (last && !!last.bold === !!run.bold && !!last.highlight === !!run.highlight) {
      last.text += run.text;
    } else {
      out.push({ ...run });
    }
  }
  return out;
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

    if (run.highlight && run.bold) {
      return (
        <b key={key} data-hl="1" className="font-semibold" style={{ color: 'var(--color-slide-hl)' }}>
          {inner}
        </b>
      );
    }
    if (run.highlight) {
      return (
        <span key={key} data-hl="1" style={{ color: 'var(--color-slide-hl)' }}>
          {inner}
        </span>
      );
    }
    if (run.bold) {
      return (
        <b key={key} className="font-semibold">
          {inner}
        </b>
      );
    }
    return <span key={key}>{inner}</span>;
  });
}
