import { useCallback, useEffect, useRef, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react';
import { fromDom, isEmpty, resolveRunColor, FONT_FAMILY_OPTIONS, FONT_SIZE_SCALE, type RichRun, type RichText } from '@/lib/richText';
import { cn } from '@/lib/cn';

interface RichEditableProps {
  value: RichText;
  onCommit: (next: RichText) => void;
  onFocus?: (element: HTMLDivElement) => void;
  onBlur?: () => void;
  onSelectionChange?: () => void;
  placeholder: string;
  multiline?: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel: string;
}

/**
 * Rich contenteditable. Renders its value as React children (safe, no innerHTML).
 * Skips re-rendering while focused so the caret is preserved during typing.
 * On blur, parses the DOM into RichText and commits.
 */
export function RichEditable({
  value,
  onCommit,
  onFocus,
  onSelectionChange,
  placeholder,
  multiline = false,
  className,
  style,
  ariaLabel,
  onBlur,
}: RichEditableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hasFocusRef = useRef(false);

  // Reconcile external value changes back into the DOM, but only when NOT focused.
  useEffect(() => {
    if (hasFocusRef.current) return;
    const el = ref.current;
    if (!el) return;
    // For simplicity always rebuild when not focused:
    el.innerHTML = '';
    if (value.length === 0) return;
    const container = document.createElement('div');
    for (const run of value) {
      container.appendChild(buildRunNode(run));
    }
    el.innerHTML = container.innerHTML;
  }, [value]);

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      hasFocusRef.current = true;
      onFocus?.(event.currentTarget);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      hasFocusRef.current = false;
      const next = fromDom(event.currentTarget);
      if (JSON.stringify(value) !== JSON.stringify(next)) {
        onCommit(next);
      }
      onBlur?.();
    },
    [value, onCommit, onBlur],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!multiline && event.key === 'Enter') {
        event.preventDefault();
        event.currentTarget.blur();
      }
      if (event.key === 'Escape') event.currentTarget.blur();
    },
    [multiline],
  );

  return (
    <div
      ref={ref}
      role="textbox"
      aria-label={ariaLabel}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      data-empty={isEmpty(value) ? 'true' : undefined}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onKeyUp={onSelectionChange}
      onMouseUp={onSelectionChange}
      style={style}
      className={cn(
        'relative outline-none transition-colors duration-150 focus:outline-none',
        'data-[empty=true]:before:pointer-events-none data-[empty=true]:before:absolute data-[empty=true]:before:content-[attr(data-placeholder)] data-[empty=true]:before:text-white/25',
        '-mx-2 rounded-md px-2 py-1 hover:bg-white/[0.02] focus:bg-white/[0.03] focus:ring-1 focus:ring-brand/25',
        className,
      )}
    />
  );
}

function buildRunNode(run: RichRun): HTMLElement {
  const inner = run.bold ? document.createElement('b') : document.createElement('span');
  inner.textContent = run.text;

  const color = resolveRunColor(run);
  if (color) inner.style.color = color;
  if (run.fontFamily) {
    inner.dataset['font'] = run.fontFamily;
    inner.style.fontFamily = FONT_FAMILY_OPTIONS[run.fontFamily].stack;
  }
  if (run.size && run.size !== 'md') {
    inner.dataset['size'] = run.size;
    inner.style.fontSize = `${FONT_SIZE_SCALE[run.size].em}em`;
  }
  if (run.highlight) inner.dataset['hl'] = '1';
  if (run.color && run.color !== 'default') inner.dataset['color'] = run.color;

  const wrapper = document.createElement('span');
  wrapper.appendChild(inner);
  return wrapper;
}

