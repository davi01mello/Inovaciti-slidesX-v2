import { useMemo } from 'react';
import { planDeckArt, type ArtChoice } from '@/services/deckArt';
import { deckRoles } from '@/services/slideArchetype';
import { clampTone, DEFAULT_TONE } from '@/services/tone';
import type { Presentation } from '@/types/presentation';
import type { Slide } from '@/types/slide';

/**
 * O PLANO VISUAL DO DECK, num lugar só.
 *
 * Qual arte vai em cada slide e qual arranjo ela usa. É derivado, nunca guardado:
 * (id da apresentação, tone, papéis dos slides) → sempre o mesmo plano, em
 * qualquer render.
 *
 * Por que derivar em vez de persistir: se o plano estivesse salvo, arrastar a barra
 * de cor teria que reescrever o storage a cada pixel do arrasto, e um deck salvo em
 * versão antiga apontaria pra artes que não existem mais. Derivado, o pior que
 * acontece ao trocar o catálogo de artes é o deck ficar mais bonito.
 *
 * É esta pureza que garante o requisito mais chato do sistema: palco, miniatura,
 * apresentação e export renderizam o MESMO pixel.
 */
export interface DeckPlan {
  tone: number;
  art: Map<string, ArtChoice>;
}

export function planFor(id: string, tone: number, slides: Slide[]): DeckPlan {
  const safe = clampTone(tone);
  return { tone: safe, art: planDeckArt(id, safe, deckRoles(slides)) };
}

export function planForPresentation(pres: Presentation): DeckPlan {
  return planFor(pres.id, pres.tone ?? DEFAULT_TONE, pres.slides);
}

const EMPTY_PLAN: DeckPlan = { tone: DEFAULT_TONE, art: new Map() };

/** O plano do deck, memoizado. Recalcula quando o tom muda (a barra) ou os slides mudam. */
export function useDeckPlan(pres: Presentation | null): DeckPlan {
  const id = pres?.id;
  const tone = pres?.tone;
  const slides = pres?.slides;
  return useMemo(
    () => (id && slides ? planFor(id, tone ?? DEFAULT_TONE, slides) : EMPTY_PLAN),
    [id, tone, slides],
  );
}
