import { useEffect } from 'react';
import type { RefObject } from 'react';

/** Invokes `handler` when a pointer event lands outside every ref in `refs`. */
export function useOnClickOutside(refs: RefObject<HTMLElement | null>[], handler: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const clickedInside = refs.some((ref) => ref.current?.contains(target));
      if (!clickedInside) handler();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [refs, handler, active]);
}
