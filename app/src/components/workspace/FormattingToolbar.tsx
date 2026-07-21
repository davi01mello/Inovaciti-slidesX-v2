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

/**
 * Toolbar flutuante de formatação — aparece sobre o texto focado/selecionado.
 *
 * Uma linha só, em grupos: fonte · tamanho · negrito · cor · alinhamento · lixeira.
 * Toda mudança aparece NA HORA (estilo inline vai junto com a marca, ver
 * applyMarkToSelection). Sem nada selecionado, o clique aplica ao texto inteiro
 * do bloco — o mesmo atalho mental do Canva.
 */

interface Point {
  top: number;
  left: number;
}

interface FormatState {
  bold: boolean;
  /** O bloco JÁ nasce em peso bold pelo design (títulos). O botão B não se aplica. */
  baseBold: boolean;
  highlight: boolean;
  align: BlockAlign | null;
  color: TextColorKey;
  fontFamily: FontFamilyKey | null;
  size: FontSizeKey;
}

const EMPTY_STATE: FormatState = {
  bold: false,
  baseBold: false,
  highlight: false,
  align: null,
  color: 'default',
  fontFamily: null,
  size: 'md',
};

const COLOR_ORDER: TextColorKey[] = ['default', 'white', 'gray', 'green'];
const FONT_ORDER: FontFamilyKey[] = ['poppins', 'sora', 'inter', 'space-grotesk', 'manrope', 'outfit'];
const SIZE_ORDER: FontSizeKey[] = ['sm', 'md', 'lg', 'xl'];

const COLOR_LABEL: Record<TextColorKey, string> = {
  default: 'Cor padrão',
  white: 'Branco',
  gray: 'Cinza',
  green: 'Verde CITi',
};

function swatchFor(color: TextColorKey): string {
  return color === 'default' ? '#F7F7F7' : TEXT_COLOR_PALETTE[color];
}

interface Context {
  presentationId: string;
  slideId: string;
  blockId: string;
}

export function FormattingToolbar({ presentationId, slideId }: { presentationId: string; slideId: string }) {
  const [pos, setPos] = useState<Point | null>(null);
  const [state, setState] = useState<FormatState>(EMPTY_STATE);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const editableRef = useRef<HTMLElement | null>(null);

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
          hide();
          return;
        }
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          hide();
          return;
        }
        show(editableFromRange, { top: rect.top - 54, left: rect.left + rect.width / 2 });
        return;
      }

      if (editable && blockContainer) {
        const rect = editable.getBoundingClientRect();
        show(editable, { top: rect.top - 54, left: rect.left + Math.min(200, rect.width / 2) });
        return;
      }

      hide();
    }

    function show(editable: HTMLElement, point: Point) {
      editableRef.current = editable;
      // Mantém a toolbar inteira dentro da viewport (ela centraliza no left).
      const HALF = 260;
      setPos({
        top: Math.max(point.top, 12),
        left: Math.min(Math.max(point.left, HALF), window.innerWidth - HALF),
      });
      setState(readFormatState(editable));
      const blockEl = editable.closest('[data-block-id]') as HTMLElement | null;
      setCtx(blockEl ? { presentationId, slideId, blockId: blockEl.dataset['blockId'] ?? '' } : null);
    }

    function hide() {
      editableRef.current = null;
      setPos(null);
      setCtx(null);
    }

    document.addEventListener('selectionchange', read);
    document.addEventListener('focusin', read);
    const onFocusOut = () => setTimeout(read, 0);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('selectionchange', read);
      document.removeEventListener('focusin', read);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, [presentationId, slideId]);

  useEffect(() => {
    if (!pos) setFontMenuOpen(false);
  }, [pos]);

  if (!pos) return null;

  /** Sem seleção, seleciona o texto inteiro do bloco — o clique sempre tem efeito visível. */
  function ensureSelection(): boolean {
    const selection = window.getSelection();
    const editable = editableRef.current;
    if (!selection || !editable) return false;
    if (!selection.isCollapsed && selection.rangeCount > 0) return true;
    if ((editable.textContent ?? '').length === 0) return false;
    const range = document.createRange();
    range.selectNodeContents(editable);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  function applyBold() {
    // Num bloco que já é bold por design (títulos), o comando do navegador
    // entenderia o clique como "tirar o negrito" e emitiria font-weight: normal —
    // um estado que o modelo de runs não guarda (sumiria no primeiro save).
    if (state.baseBold || !ensureSelection()) return;
    // styleWithCSS fica ligado depois de um destaque verde (o foreColor precisa
    // dele). Desligado, o comando emite <b> — que é o que fromDom entende.
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('bold');
    setState((prev) => ({ ...prev, bold: !prev.bold }));
  }

  function applyHighlightGreen() {
    if (!ensureSelection()) return;
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, '#09E880');
    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>('font, span').forEach((el) => {
        if (el.style.color && normalizeColor(el.style.color) === '#09e880') {
          el.setAttribute('data-hl', '1');
        }
      });
    });
    setState((prev) => ({ ...prev, highlight: true, color: 'default' }));
  }

  function clearHighlight(baseColor: string) {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, baseColor);
    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>('[data-hl="1"]').forEach((el) => {
        const color = el.style.color ? normalizeColor(el.style.color) : '';
        if (color !== '#09e880') el.removeAttribute('data-hl');
      });
    });
  }

  function applyColor(color: TextColorKey) {
    if (!ensureSelection()) return;
    const editable = editableRef.current;
    const baseColor = editable ? window.getComputedStyle(editable).color : '#F7F7F7';
    if (color === 'green') {
      applyHighlightGreen();
      return;
    }
    if (state.highlight) clearHighlight(baseColor);
    const applied =
      color === 'default'
        ? applyMarkToSelection({}, ['color'], { inheritColor: baseColor })
        : applyMarkToSelection({ color });
    if (applied) setState((prev) => ({ ...prev, color, highlight: false }));
  }

  function applyFontFamily(fontFamily: FontFamilyKey) {
    if (!ensureSelection()) return;
    const next = state.fontFamily === fontFamily ? undefined : fontFamily;
    const applied = applyMarkToSelection(next ? { fontFamily: next } : {}, next ? [] : ['fontFamily']);
    if (applied) setState((prev) => ({ ...prev, fontFamily: next ?? null }));
  }

  function applySize(size: FontSizeKey) {
    if (!ensureSelection()) return;
    const applied = applyMarkToSelection(size === 'md' ? {} : { size }, size === 'md' ? ['size'] : []);
    if (applied) setState((prev) => ({ ...prev, size }));
  }

  function applyAlign(align: BlockAlign) {
    if (!ctx) return;
    presentationsStore.updateBlock(ctx.presentationId, ctx.slideId, ctx.blockId, { align });
    setState((prev) => ({ ...prev, align }));
  }

  function deleteBlock() {
    if (!ctx || !ctx.blockId) return;
    presentationsStore.deleteBlock(ctx.presentationId, ctx.slideId, ctx.blockId);
    setPos(null);
    setCtx(null);
  }

  return (
    <div
      className="glass-deep pointer-events-auto fixed z-[70] flex -translate-x-1/2 items-center gap-0.5 rounded-xl p-1"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(event) => event.preventDefault()}
    >
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

      <Divider />

      <div className="flex items-center gap-px rounded-lg bg-white/[0.03] p-0.5">
        {SIZE_ORDER.map((size) => (
          <ToolbarButton
            key={size}
            onClick={() => applySize(size)}
            active={state.size === size}
            label={`Tamanho ${FONT_SIZE_SCALE[size].label}`}
            compact
          >
            <span className="text-[10px] font-semibold">{FONT_SIZE_SCALE[size].label}</span>
          </ToolbarButton>
        ))}
      </div>

      <Divider />

      <ToolbarButton
        onClick={applyBold}
        active={state.bold || state.baseBold}
        disabled={state.baseBold}
        label={state.baseBold ? 'Este texto já é negrito no design do template' : 'Negrito'}
      >
        <span className="text-[13px] font-bold">B</span>
      </ToolbarButton>

      <Divider />

      <div className="flex items-center gap-1 px-1">
        {COLOR_ORDER.map((color) => (
          <button
            key={color}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyColor(color)}
            aria-label={COLOR_LABEL[color]}
            title={COLOR_LABEL[color]}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110',
              (color === 'green' ? state.highlight : !state.highlight && state.color === color) &&
                'ring-2 ring-brand/70 ring-offset-2 ring-offset-surface-3',
            )}
          >
            <span
              className="h-4 w-4 rounded-full ring-1 ring-inset ring-white/25"
              style={{ background: swatchFor(color) }}
            />
          </button>
        ))}
      </div>

      <Divider />

      {(['left', 'center', 'right', 'justify'] as BlockAlign[]).map((align) => (
        <ToolbarButton
          key={align}
          onClick={() => applyAlign(align)}
          active={state.align === align}
          label={
            align === 'left' ? 'Alinhar à esquerda' : align === 'center' ? 'Centralizar' : align === 'right' ? 'Alinhar à direita' : 'Justificar'
          }
        >
          <AlignIcon direction={align} />
        </ToolbarButton>
      ))}

      {ctx?.blockId && (
        <>
          <Divider />
          <ToolbarButton onClick={deleteBlock} active={false} label="Remover bloco" danger>
            <TrashIcon />
          </ToolbarButton>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Divider() {
  return <div className="mx-0.5 h-4 w-px bg-white/10" />;
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
  label: string;
  children: React.ReactNode;
  compact?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

function ToolbarButton({ onClick, active, label, children, compact = false, danger = false, disabled = false }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors duration-150',
        compact ? 'h-6 w-6' : 'h-7 w-7',
        active ? 'bg-brand/[0.16] text-brand' : 'text-ink-secondary hover:bg-white/[0.05] hover:text-ink',
        danger && 'hover:bg-danger-soft hover:text-danger',
        disabled && 'cursor-not-allowed opacity-45 hover:bg-transparent',
      )}
    >
      {children}
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
      if (!ref.current?.contains(event.target as Node)) onClose();
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
          'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium transition-colors duration-150',
          value ? 'bg-brand/[0.16] text-brand' : 'text-ink-secondary hover:bg-white/[0.05] hover:text-ink',
        )}
      >
        <span className="max-w-[84px] truncate" style={{ fontFamily: value ? FONT_FAMILY_OPTIONS[value].stack : undefined }}>
          {label}
        </span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="glass-deep absolute left-0 top-[calc(100%+6px)] z-[80] w-[176px] animate-menu-in rounded-lg p-1">
          {FONT_ORDER.map((font) => (
            <button
              key={font}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(font)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] transition-colors duration-150',
                value === font ? 'bg-brand/[0.14] text-brand' : 'text-ink-secondary hover:bg-white/[0.05] hover:text-ink',
              )}
              style={{ fontFamily: FONT_FAMILY_OPTIONS[font].stack }}
            >
              {FONT_FAMILY_OPTIONS[font].label}
              {value === font && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="m5 12.5 4.5 4.5L19 7" />
                </svg>
              )}
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
  // Peso que o DESIGN dá ao bloco (título = 800): lido no container, não na
  // seleção — dentro de um <b> a computada já viria bold e confundiria as coisas.
  const baseWeight = focusedBlock ? Number.parseInt(window.getComputedStyle(focusedBlock).fontWeight, 10) : 400;
  const baseBold = Number.isFinite(baseWeight) && baseWeight >= 600;

  if (!selection || selection.rangeCount === 0) return { ...EMPTY_STATE, align, baseBold };

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
  return { bold, baseBold, highlight, align, color, fontFamily, size };
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
