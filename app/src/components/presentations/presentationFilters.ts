import type { Presentation, PresentationStatus } from '@/types/presentation';

export type StatusFilter = 'todas' | PresentationStatus;
export type SortOrder = 'recentes' | 'nome';
export type ViewMode = 'grid' | 'list';

export interface StatusCounts {
  todas: number;
  ready: number;
  generating: number;
  draft: number;
}

/** Contagem por status num único passe — alimenta os tiles de filtro. */
export function countByStatus(presentations: Presentation[]): StatusCounts {
  const counts: StatusCounts = { todas: presentations.length, ready: 0, generating: 0, draft: 0 };
  for (const p of presentations) counts[p.status] += 1;
  return counts;
}

export function filterPresentations(
  presentations: Presentation[],
  status: StatusFilter,
  query: string,
): Presentation[] {
  const q = query.trim().toLowerCase();
  return presentations.filter((p) => {
    if (status !== 'todas' && p.status !== status) return false;
    if (q && !p.title.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function sortPresentations(presentations: Presentation[], sort: SortOrder): Presentation[] {
  const sorted = [...presentations];
  if (sort === 'nome') return sorted.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  return sorted.sort((a, b) => b.updatedAt - a.updatedAt);
}
