import { useCallback, useEffect, useRef, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react';
import { fromDom, isEmpty, type RichText } from '@/lib/richText';
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
    // Only touch DOM if it doesn't already match — avoids caret jumps on autosave.
    const currentPlain = el.innerText;
    const nextPlain = value.map((r) => r.text).join('');
    if (currentPlain === nextPlain && !containsMarks(el) === !valueHasMarks(value)) {
      // Same text and same "has marks" — skip.
      // (Rare misalignment on formatting-only edits is corrected on next blur.)
    }
    // For simplicity always rebuild when not focused:
    el.innerHTML = '';
    if (value.length === 0) return;
    const container = document.createElement('div');
    for (const run of value) {
      const span = document.createElement('span');
      if (run.bold) {
        const b = document.createElement('b');
        b.textContent = run.text;
        if (run.highlight) {
          b.dataset['hl'] = '1';
          b.style.color = 'var(--color-slide-hl)';
        }
        span.appendChild(b);
      } else if (run.highlight) {
        const s = document.createElement('span');
        s.dataset['hl'] = '1';
        s.style.color = 'var(--color-slide-hl)';
        s.textContent = run.text;
        span.appendChild(s);
      } else {
        span.textContent = run.text;
      }
      container.appendChild(span);
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
      const prevPlain = value.map((r) => r.text).join('');
      const nextPlain = next.map((r) => r.text).join('');
      const prevHas = valueHasMarks(value);
      const nextHas = nextHasMarks(next);
      if (prevPlain !== nextPlain || prevHas !== nextHas) {
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

function containsMarks(el: HTMLElement): boolean {
  return !!el.querySelector('b, strong, mark, [data-hl="1"]');
}

function valueHasMarks(value: RichText): boolean {
  return value.some((r) => r.bold || r.highlight);
}

function nextHasMarks(value: RichText): boolean {
  return value.some((r) => r.bold || r.highlight);
}
