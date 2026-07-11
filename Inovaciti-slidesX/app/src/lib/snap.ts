import type { BlockRect } from '@/types/slide';

export type GuideOrientation = 'v' | 'h';
export type GuideKind = 'edge' | 'center';

export interface Guide {
  orientation: GuideOrientation;
  /** Normalized position along the perpendicular axis (0..1). */
  at: number;
  kind: GuideKind;
}

const SNAP_THRESHOLD = 0.01; // ~10px on a 1000px-wide slide

interface Candidate {
  at: number;
  kind: GuideKind;
}

function verticalCandidatesFor(rect: BlockRect): Candidate[] {
  return [
    { at: rect.x, kind: 'edge' },
    { at: rect.x + rect.width / 2, kind: 'center' },
    { at: rect.x + rect.width, kind: 'edge' },
  ];
}

function horizontalCandidatesFor(rect: BlockRect): Candidate[] {
  return [
    { at: rect.y, kind: 'edge' },
    { at: rect.y + rect.height / 2, kind: 'center' },
    { at: rect.y + rect.height, kind: 'edge' },
  ];
}

const SLIDE_V_CANDIDATES: Candidate[] = [
  { at: 0, kind: 'edge' },
  { at: 0.5, kind: 'center' },
  { at: 1, kind: 'edge' },
];

const SLIDE_H_CANDIDATES: Candidate[] = [
  { at: 0, kind: 'edge' },
  { at: 0.5, kind: 'center' },
  { at: 1, kind: 'edge' },
];

/**
 * Given a rect being dragged and every other block's rect on the same slide,
 * find the closest vertical and horizontal snap candidates and return an
 * adjusted rect + the guide lines that should be drawn.
 *
 * Only positions are snapped, never sizes.
 */
export function snapForMove(rect: BlockRect, others: BlockRect[]): { snapped: BlockRect; guides: Guide[] } {
  const guides: Guide[] = [];
  let x = rect.x;
  let y = rect.y;

  const draggedV = verticalCandidatesFor(rect);
  const draggedH = horizontalCandidatesFor(rect);

  const targetV: Candidate[] = [...SLIDE_V_CANDIDATES];
  const targetH: Candidate[] = [...SLIDE_H_CANDIDATES];
  for (const other of others) {
    targetV.push(...verticalCandidatesFor(other));
    targetH.push(...horizontalCandidatesFor(other));
  }

  // Vertical snap: check each edge/center of the dragged rect vs candidates.
  let bestVDelta: number | null = null;
  let bestVGuideAt: number | null = null;
  let bestVGuideKind: GuideKind = 'edge';
  for (let i = 0; i < draggedV.length; i++) {
    const drag = draggedV[i]!;
    for (const t of targetV) {
      const delta = t.at - drag.at;
      if (Math.abs(delta) < SNAP_THRESHOLD && (bestVDelta === null || Math.abs(delta) < Math.abs(bestVDelta))) {
        bestVDelta = delta;
        bestVGuideAt = t.at;
        bestVGuideKind = drag.kind === 'center' || t.kind === 'center' ? 'center' : 'edge';
      }
    }
  }
  if (bestVDelta !== null && bestVGuideAt !== null) {
    x = rect.x + bestVDelta;
    guides.push({ orientation: 'v', at: bestVGuideAt, kind: bestVGuideKind });
  }

  let bestHDelta: number | null = null;
  let bestHGuideAt: number | null = null;
  let bestHGuideKind: GuideKind = 'edge';
  for (let i = 0; i < draggedH.length; i++) {
    const drag = draggedH[i]!;
    for (const t of targetH) {
      const delta = t.at - drag.at;
      if (Math.abs(delta) < SNAP_THRESHOLD && (bestHDelta === null || Math.abs(delta) < Math.abs(bestHDelta))) {
        bestHDelta = delta;
        bestHGuideAt = t.at;
        bestHGuideKind = drag.kind === 'center' || t.kind === 'center' ? 'center' : 'edge';
      }
    }
  }
  if (bestHDelta !== null && bestHGuideAt !== null) {
    y = rect.y + bestHDelta;
    guides.push({ orientation: 'h', at: bestHGuideAt, kind: bestHGuideKind });
  }

  return { snapped: { ...rect, x, y }, guides };
}
