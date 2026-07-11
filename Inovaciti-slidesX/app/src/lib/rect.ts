import type { BlockRect } from '@/types/slide';

const MIN_WIDTH = 0.06;
const MIN_HEIGHT = 0.04;

/** Ensures a rect stays within [0, 1] on both axes and never falls below a usable minimum size. */
export function clampRect(rect: BlockRect): BlockRect {
  const width = Math.max(MIN_WIDTH, Math.min(1, rect.width));
  const height = Math.max(MIN_HEIGHT, Math.min(1, rect.height));
  const x = Math.max(0, Math.min(1 - width, rect.x));
  const y = Math.max(0, Math.min(1 - height, rect.y));
  return { x, y, width, height };
}

export function rectContains(outer: BlockRect, inner: BlockRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function rectEquals(a: BlockRect, b: BlockRect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
