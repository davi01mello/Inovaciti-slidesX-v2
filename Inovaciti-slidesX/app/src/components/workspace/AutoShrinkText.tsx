import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface AutoShrinkTextProps {
  children: ReactNode;
  /** Minimum scale factor before we stop shrinking. Prevents unreadable text. */
  minScale?: number;
  /**
   * Passed down as a memoization signal. When it changes, we retrigger measurement.
   * Typical: a stringified version of the content or the block rect.
   */
  signal?: unknown;
  className?: string;
  style?: CSSProperties;
}

/**
 * Google-Slides / Figma style overflow guard. The wrapper observes the intrinsic
 * size of its content and applies `transform: scale(k)` if it wouldn't fit inside
 * the parent bounding box, with `k = min(w/parentW, h/parentH)`.
 *
 * The content itself is `position: absolute` with natural size — no wrapping is forced,
 * we simply scale it down as needed. `transform-origin: top left` keeps anchoring
 * predictable relative to the parent.
 */
export function AutoShrinkText({ children, minScale = 0.35, signal, className, style }: AutoShrinkTextProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    function measure() {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const outerRect = outer.getBoundingClientRect();
      // Reset scale before measuring inner intrinsic size so we don't compound.
      inner.style.transform = 'none';
      const innerRect = inner.getBoundingClientRect();
      if (outerRect.width <= 0 || outerRect.height <= 0) return;
      const scaleX = outerRect.width / Math.max(innerRect.width, 1);
      const scaleY = outerRect.height / Math.max(innerRect.height, 1);
      const nextScale = Math.max(minScale, Math.min(1, scaleX, scaleY));
      setScale(nextScale);
      inner.style.transform = `scale(${nextScale})`;
    }
    measure();

    const outerObs = new ResizeObserver(measure);
    const innerObs = new ResizeObserver(measure);
    if (outerRef.current) outerObs.observe(outerRef.current);
    if (innerRef.current) innerObs.observe(innerRef.current);

    return () => {
      outerObs.disconnect();
      innerObs.disconnect();
    };
  }, [minScale, signal]);

  useEffect(() => {
    const inner = innerRef.current;
    if (inner) inner.style.transform = `scale(${scale})`;
  }, [scale]);

  return (
    <div
      ref={outerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', ...style }}
    >
      <div
        ref={innerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          // width kept normal so text wraps to the outer box, then scale shrinks it if
          // vertical overflow remains. This matches Google Slides behavior.
          width: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
}
