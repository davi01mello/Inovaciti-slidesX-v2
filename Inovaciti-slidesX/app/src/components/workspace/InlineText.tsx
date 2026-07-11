import { useCallback, useEffect, useRef, type KeyboardEvent, type FocusEvent } from 'react';
import { cn } from '@/lib/cn';

interface InlineTextProps {
  value: string;
  placeholder: string;
  onCommit: (next: string) => void;
  multiline?: boolean;
  singleLineEnter?: 'commit' | 'ignore';
  className?: string;
  ariaLabel: string;
}

/** Contenteditable-based inline editor. Commits on blur; Enter commits (singleline) or inserts newline (multiline). */
export function InlineText({
  value,
  placeholder,
  onCommit,
  multiline = false,
  singleLineEnter = 'commit',
  className,
  ariaLabel,
}: InlineTextProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerText !== value) {
      el.innerText = value;
    }
  }, [value]);

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const next = event.currentTarget.innerText.replace(/ /g, ' ').trim();
      if (next !== value) onCommit(next);
    },
    [value, onCommit],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!multiline && singleLineEnter === 'commit' && event.key === 'Enter') {
        event.preventDefault();
        event.currentTarget.blur();
      }
      if (event.key === 'Escape') {
        event.currentTarget.blur();
      }
    },
    [multiline, singleLineEnter],
  );

  return (
    <div
      ref={ref}
      role="textbox"
      aria-label={ariaLabel}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative outline-none transition-colors duration-150 focus:outline-none',
        'empty:before:pointer-events-none empty:before:absolute empty:before:content-[attr(data-placeholder)] empty:before:text-ink-muted/60',
        'rounded-md px-2 py-1 -mx-2 hover:bg-white/[0.02] focus:bg-white/[0.03] focus:ring-1 focus:ring-brand/25',
        className,
      )}
    />
  );
}
