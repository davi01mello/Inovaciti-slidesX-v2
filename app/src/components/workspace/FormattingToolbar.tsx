import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { presentationsStore } from '@/stores/presentationsStore';
import {
  applyMarkToSelection,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_SCALE,
  TEXT_COLOR_PALETTE,
  type FontFamilyKey,
  type FontSizeKey,
  type TextColorKey,
} from '@/lib/richText';
import type { BlockAlign } from '@/types/slide';

interface Rect {
  top: number;
  left: number;
}

interface FormatState {
  bold: boolean;
  highlight: boolean;
  align: BlockAlign | null;
  color: TextColorKey;
  fontFamily: FontFamilyKey | null;
  size: FontSizeKey;
}

const COLOR_ORDER: TextColorKey[] = ['default', 'white', 'gray', 'green'];
const FONT_ORDER: FontFamilyKey[] = ['sora', 'inter', 'poppins', 'space-grotesk', 'manrope', 'outfit'];
const SIZE_ORDER: FontSizeKey[] = ['sm', 'md', 'lg', 'xl'];

function swatchFor(color: TextColorKey): string {
  if (color === 'default') return '#F7F7F7';
  return TEXT_COLOR_PALETTE[color];
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
  const [state, setState] = useState<FormatState>({
    bold: false,
    highlight: false,
    align: null,
    color: 'default',
    fontFamily: null,
    size: 'md',
  });
  const [ctx, setCtx] = useState<Context | null>(null);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!pos) setFontMenuOpen(false);
  }, [pos]);

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

  function applyColor(color: TextColorKey) {
    if (color === 'green') {
      applyInline('highlight');
      return;
    }
    if (state.highlight) applyInline('default-color');
    const applied = applyMarkToSelection({ color }, color === 'default' ? ['color'] : []);
    if (applied) setState((prev) => ({ ...prev, color, highlight: false }));
  }

  function applyFontFamily(fontFamily: FontFamilyKey) {
    const next = state.fontFamily === fontFamily ? undefined : fontFamily;
    const applied = applyMarkToSelection({ fontFamily: next }, next ? [] : ['fontFamily']);
    if (applied) setState((prev) => ({ ...prev, fontFamily: next ?? null }));
  }

  function applySize(size: FontSizeKey) {
    const applied = applyMarkToSelection({ size }, size === 'md' ? ['size'] : []);
    if (applied) setState((prev) => ({ ...prev, size }));
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
      className="pointer-events-auto fixed z-[70] flex -translate-x-1/2 flex-col gap-1 rounded-xl border border-white/[0.08] bg-surface-3 p-1 shadow-[0_16px_32px_-16px_rgba(0,0,0,0.6)]"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={() => applyInline('bold')} active={state.bold} ariaLabel="Negrito">
          <span className="text-[13px] font-bold">B</span>
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-white/10" />
        <FontDropdown
          open={fontMenuOpen}
          onToggle={() => setFontMenuOpen((v) => !v)}
          onClose={() => setFontMenuOpen(false)}
          value={state.fontFamily}
          onSelect={(font) => {
            applyFontFamily(font);
            setFontMenuOpen(false);
          }}
        />
        <div className="mx-1 h-4 w-px bg-white/10" />
        {SIZE_ORDER.map((size) => (
          <ToolbarButton
            key={size}
            onClick={() => applySize(size)}
            active={state.size === size}
            ariaLabel={`Tamanho ${FONT_SIZE_SCALE[size].label}`}
          >
            <span className="text-[10px] font-medium">{FONT_SIZE_SCALE[size].label}</span>
          </ToolbarButton>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {COLOR_ORDER.map((color) => (
          <ToolbarButton
            key={color}
            onClick={() => applyColor(color)}
            active={color === 'green' ? state.highlight : !state.highlight && state.color === color}
            ariaLabel={color === 'default' ? 'Cor padrão' : color === 'white' ? 'Branco' : color === 'gray' ? 'Cinza' : 'Verde CITi'}
            swatch={swatchFor(color)}
          />
        ))}
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

interface FontDropdownProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  value: FontFamilyKey | null;
  onSelect: (font: FontFamilyKey) => void;
}

function FontDropdown({ open, onToggle, onClose, value, onSelect }: FontDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) onClose();
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open, onClose]);

  const label = value ? FONT_FAMILY_OPTIONS[value].label : 'Fonte';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onToggle}
        aria-pressed={!!value}
        aria-label="Fonte"
        title="Fonte"
        className={cn(
          'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-ink-secondary transition-colors duration-150',
          value ? 'bg-white/[0.08] text-ink' : 'hover:bg-white/[0.04] hover:text-ink',
        )}
      >
        <span className="max-w-[74px] truncate" style={{ fontFamily: value ? FONT_FAMILY_OPTIONS[value].stack : undefined }}>
          {label}
        </span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[80] w-[168px] animate-menu-in rounded-lg border border-white/[0.08] bg-surface-3 p-1 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.7)]">
          {FONT_ORDER.map((font) => (
            <button
              key={font}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(font)}
              className={cn(
                'flex w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] transition-colors duration-150',
                value === font ? 'bg-white/[0.08] text-ink' : 'text-ink-secondary hover:bg-white/[0.04] hover:text-ink',
              )}
              style={{ fontFamily: FONT_FAMILY_OPTIONS[font].stack }}
            >
              {FONT_FAMILY_OPTIONS[font].label}
            </button>
          ))}
        </div>
      )}
    </div>
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

  const empty: FormatState = { bold: false, highlight: false, align, color: 'default', fontFamily: null, size: 'md' };
  if (!selection || selection.rangeCount === 0) return empty;

  let node: Node | null = selection.anchorNode;
  let bold = false;
  let highlight = false;
  let color: TextColorKey = 'default';
  let fontFamily: FontFamilyKey | null = null;
  let size: FontSizeKey = 'md';
  while (node && node !== root.parentElement) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === 'b' || tag === 'strong') bold = true;
      if (tag === 'mark' || el.dataset['hl'] === '1') highlight = true;
      if (el.style.color && normalizeColor(el.style.color) === '#09e880') highlight = true;
      const dataColor = el.dataset['color'];
      if (color === 'default' && dataColor && (COLOR_ORDER as string[]).includes(dataColor)) {
        color = dataColor as TextColorKey;
      }
      const dataFont = el.dataset['font'];
      if (!fontFamily && dataFont && (FONT_ORDER as string[]).includes(dataFont)) {
        fontFamily = dataFont as FontFamilyKey;
      }
      const dataSize = el.dataset['size'];
      if (size === 'md' && dataSize && (SIZE_ORDER as string[]).includes(dataSize)) {
        size = dataSize as FontSizeKey;
      }
    }
    node = node.parentNode;
  }
  return { bold, highlight, align, color, fontFamily, size };
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
