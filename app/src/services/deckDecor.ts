import { createId } from '@/lib/id';
import { clampRect } from '@/lib/rect';
import { composeArtAs, emptiestCorner } from '@/services/artZones';
import { artById, planDeckArt } from '@/services/deckArt';
import { ELEMENTS, type ElementAsset } from '@/services/elementsManifest';
import { deckRoles } from '@/services/slideArchetype';
import { toneBandOf } from '@/services/tone';
import type { Archetype } from '@/services/artZones';
import type { Decoration, Slide } from '@/types/slide';

/**
 * O DECORADOR DO DECK: planta os elementos 3D da marca (as bolhas) em alguns
 * slides de respiro, como um designer faria — um acento orgânico no canto mais
 * vazio, nunca em cima do texto.
 *
 * Três decisões que mantêm isso elegante em vez de poluído:
 *
 *   ONDE   só em slides de texto-herói (afirmação, citação, número, separador),
 *          que têm espaço sobrando; nunca em slides densos (cards, painéis) nem
 *          em cima de foto. E no MÁXIMO um elemento por slide, três por deck.
 *   QUAL   a cor do elemento segue a faixa do EIXO DE COR do deck (verde puxa
 *          bolhas verdes/degradê, azul puxa azuis) — coerência, não confete.
 *   COMO   a posição vem do MESMO motor que mede a arte (emptiestCorner): o
 *          elemento cai no canto comprovadamente mais vazio daquela arte, com
 *          uma leve rotação determinística.
 *
 * Tudo determinístico a partir de (id, tone, slides) — sem Math.random(). E o
 * resultado são DECORAÇÕES comuns: o usuário move, redimensiona e apaga cada
 * uma no editor, como qualquer elemento inserido à mão.
 */

/** FNV-1a: o mesmo hash estável usado no diretor de arte. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Slides que têm espaço de sobra pra um acento orgânico. */
const DECORATABLE = new Set<Archetype>(['statement', 'quote', 'bignumber', 'section']);

/** No máximo isto por deck: acento é tempero, não confete. */
const MAX_PER_DECK = 3;

/** As cores de elemento que conversam com cada faixa do eixo de cor. */
function paletteFor(tone: number): string[] {
  const band = toneBandOf(tone).label;
  if (band === 'Azul') return ['azul', 'gradiente-azul-verde', 'gradiente-roxo-azul-verde'];
  if (band === 'Gelo') return ['verde', 'azul', 'gradiente-azul-verde'];
  return ['verde', 'gradiente-azul-verde'];
}

function pick<T>(list: T[], seed: number): T | undefined {
  if (list.length === 0) return undefined;
  return list[seed % list.length];
}

/**
 * Decora o deck inteiro. Idempotente por construção de uso: roda UMA vez, no fim
 * da geração; os elementos viram Decorations persistidas e editáveis.
 */
export function decorateDeck(seed: string, tone: number, slides: Slide[]): Slide[] {
  if (ELEMENTS.length === 0) return slides;

  const roles = deckRoles(slides);
  const plan = planDeckArt(seed, tone, roles);
  const palette = paletteFor(tone);
  const pool: ElementAsset[] = ELEMENTS.filter((e) => palette.includes(e.color));
  if (pool.length === 0) return slides;

  let placed = 0;

  return slides.map((slide, index) => {
    if (placed >= MAX_PER_DECK) return slide;
    const role = roles[index];
    if (!role || !DECORATABLE.has(role.archetype)) return slide;
    // Slide com foto ou já decorado (logo do cliente, elemento do usuário) fica quieto.
    if (slide.image || (slide.decorations && slide.decorations.length > 0)) return slide;

    const h = hash(`${seed}|decor|${slide.id}`);
    // Cadência: ~2 em cada 3 slides elegíveis ganham o acento (o teto por deck segura).
    if (h % 3 === 2) return slide;

    const choice = plan.get(slide.id);
    const art = choice ? artById(choice.artId) : undefined;
    if (!art || !choice) return slide;

    const composition = composeArtAs(art, role.archetype, choice.arrangementId);
    const corner = emptiestCorner(art, composition);

    const element = pick(pool, h >>> 3);
    if (!element) return slide;

    // O elemento é maior que a zona do canto: ele ANCORA no centro do canto e
    // respira por cima, como as bolhas do deck oficial.
    const width = 0.14 + ((h >>> 7) % 7) * 0.01; // 0.14..0.20
    const height = width * (16 / 9) * 0.56; // proporção agradável pro blob
    const rect = clampRect({
      x: corner.x + corner.width / 2 - width / 2,
      y: corner.y + corner.height / 2 - height / 2,
      width,
      height,
    });
    const rotation = ((h >>> 11) % 41) - 20; // -20..20 graus

    const decoration: Decoration = {
      id: createId(),
      assetKey: element.key,
      rect,
      ...(rotation !== 0 ? { rotation } : {}),
    };

    placed += 1;
    return { ...slide, decorations: [...(slide.decorations ?? []), decoration] };
  });
}
