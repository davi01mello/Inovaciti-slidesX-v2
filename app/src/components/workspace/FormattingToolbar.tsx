import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { presentationsStore } from '@/stores/presentationsStore';
import type { BlockAlign } from '@/types/slide';

interface Rect {
  top: number;
  left: number;
}

interface FormatState {
  bold: boolean;
  highlight: boolean;
  align: BlockAlign | null;
}

interface Context {
  presentationId: string;
  slideId: string;
  blockId: string;
}

/**
 * Floating toolbar that appears above the current text selection or focused block.
 * Provides bold + color (brand palette only) + alignment (left/center/right/justify).
 */
export function FormattingToolbar({ presentationId, slideId }: { presentationId: string; slideId: string }) {
  const [pos, setPos] = useState<Rect | null>(null);
  const [state, setState] = useState<FormatState>({ bold: false, highlight: false, align: null });
  const [ctx, setCtx] = useState<Context | null>(null);

  useEffect(() => {
    function read() {
      const selection = window.getSelection();
      const active = document.activeElement as HTMLElement | null;

      const isCollapsed = !selection || selection.isCollapsed || selection.rangeCount === 0;
      const editable = active?.closest('[role="textbox"][contenteditable="true"]') as HTMLElement | null;
      const blockContainer = active?.closest('[data-block-id]') as HTMLElement | null;

      if (!editable && !isCollapsed && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const ancestor = container.nodeType === Node.ELEMENT_NODE ? (container as HTMLElement) : container.parentElement;
        const editableFromRange = ancestor?.closest('[role="textbox"][contenteditable="true"]') as HTMLElement | null;
        if (!editableFromRange) {
          setPos(null);
          setCtx(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          setPos(null);
          setCtx(null);
          return;
        }
        setPos({ top: rect.top - 50, left: rect.left + rect.width / 2 });
        setState(readFormatState(editableFromRange));
        const bc = editableFromRange.closest('[data-block-id]') as HTMLElement | null;
        setCtx(bc ? { presentationId, slideId, blockId: bc.dataset['blockId'] ?? '' } : null);
        return;
      }

      if (editable && blockContainer) {
        const rect = editable.getBoundingClientRect();
        setPos({ top: rect.top - 50, left: rect.left + Math.min(160, rect.width / 2) });
        setState(readFormatState(editable));
        setCtx({ presentationId, slideId, blockId: blockContainer.dataset['blockId'] ?? '' });
        return;
      }

      setPos(null);
      setCtx(null);
    }

    document.addEventListener('selectionchange', read);
    document.addEventListener('focusin', read);
    document.addEventListener('focusout', () => setTimeout(read, 0));
    return () => {
      document.removeEventListener('selectionchange', read);
      document.removeEventListener('focusin', read);
    };
  }, [presentationId, slideId]);

  if (!pos) return null;

  function applyInline(command: 'bold' | 'highlight' | 'default-color') {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    if (command === 'bold') {
      document.execCommand('bold');
    } else if (command === 'highlight') {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, '#09E880');
      requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>('font, span').forEach((el) => {
          if (el.style.color && normalizeColor(el.style.color) === '#09e880') {
            el.setAttribute('data-hl', '1');
          }
        });
      });
    } else if (command === 'default-color') {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, '#F7F7F7');
      requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>('[data-hl="1"]').forEach((el) => {
          const color = el.style.color ? normalizeColor(el.style.color) : '';
          if (color !== '#09e880') el.removeAttribute('data-hl');
        });
      });
    }
  }

  function applyAlign(align: BlockAlign) {
    if (!ctx) return;
    presentationsStore.updateBlock(ctx.presentationId, ctx.slideId, ctx.blockId, { align });
  }

  function deleteBlock() {
    if (!ctx || !ctx.blockId) return;
    presentationsStore.deleteBlock(ctx.presentationId, ctx.slideId, ctx.blockId);
    setPos(null);
    setCtx(null);
  }

  return (
    <div
      className="pointer-events-auto fixed z-[70] flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/[0.08] bg-surface-3 p-1 shadow-[0_16px_32px_-16px_rgba(0,0,0,0.6)]"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <ToolbarButton onClick={() => applyInline('bold')} active={state.bold} ariaLabel="Negrito">
        <span className="text-[13px] font-bold">B</span>
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-white/10" />
      <ToolbarButton
        onClick={() => applyInline('default-color')}
        active={!state.highlight}
        ariaLabel="Cor padrão"
        swatch="#F7F7F7"
      />
      <ToolbarButton
        onClick={() => applyInline('highlight')}
        active={state.highlight}
        ariaLabel="Verde CITi"
        swatch="#09E880"
      />
      <div className="mx-1 h-4 w-px bg-white/10" />
      <ToolbarButton onClick={() => applyAlign('left')} active={state.align === 'left'} ariaLabel="Alinhar à esquerda">
        <AlignIcon direction="left" />
      </ToolbarButton>
      <ToolbarButton onClick={() => applyAlign('center')} active={state.align === 'center'} ariaLabel="Centralizar">
        <AlignIcon direction="center" />
      </ToolbarButton>
      <ToolbarButton onClick={() => applyAlign('right')} active={state.align === 'right'} ariaLabel="Alinhar à direita">
        <AlignIcon direction="right" />
      </ToolbarButton>
      <ToolbarButton onClick={() => applyAlign('justify')} active={state.align === 'justify'} ariaLabel="Justificar">
        <AlignIcon direction="justify" />
      </ToolbarButton>
      {ctx?.blockId && (
        <>
          <div className="mx-1 h-4 w-px bg-white/10" />
          <ToolbarButton onClick={deleteBlock} active={false} ariaLabel="Remover bloco">
            <TrashIcon />
          </ToolbarButton>
        </>
      )}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  active: boolean;
  ariaLabel: string;
  children?: React.ReactNode;
  swatch?: string;
}

function ToolbarButton({ onClick, active, ariaLabel, children, swatch }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-secondary transition-colors duration-150',
        active ? 'bg-white/[0.08] text-ink' : 'hover:bg-white/[0.04] hover:text-ink',
      )}
    >
      {swatch ? (
        <span
          className={cn('h-3 w-3 rounded-full ring-1 ring-inset ring-white/20', active && 'ring-white/50')}
          style={{ background: swatch }}
        />
      ) : (
        children
      )}
    </button>
  );
}

function AlignIcon({ direction }: { direction: BlockAlign }) {
  const lines: Record<BlockAlign, string[]> = {
    left: ['M3 6h18', 'M3 12h12', 'M3 18h16'],
    center: ['M3 6h18', 'M6 12h12', 'M4 18h16'],
    right: ['M3 6h18', 'M9 12h12', 'M5 18h16'],
    justify: ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  };
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      {lines[direction].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function readFormatState(root: HTMLElement): FormatState {
  const selection = window.getSelection();
  const focusedBlock = root.closest('[data-block-id]') as HTMLElement | null;
  const align = (focusedBlock?.dataset['align'] as BlockAlign | undefined) ?? null;

  if (!selection || selection.rangeCount === 0) return { bold: false, highlight: false, align };

  let node: Node | null = selection.anchorNode;
  let bold = false;
  let highlight = false;
  while (node && node !== root.parentElement) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === 'b' || tag === 'strong') bold = true;
      if (tag === 'mark' || el.dataset['hl'] === '1') highlight = true;
      if (el.style.color && normalizeColor(el.style.color) === '#09e880') highlight = true;
    }
    node = node.parentNode;
  }
  return { bold, highlight, align };
}

function normalizeColor(input: string): string {
  const s = input.trim().toLowerCase();
  const rgbMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
  }
  return s;
}
