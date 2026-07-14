/**
 * A inteligência do passo "quantos slides".
 *
 * A ideia central: número de slide nenhum significa nada sozinho. O que orienta
 * a escolha é a CONSEQUÊNCIA dele. Então toda quantidade é traduzida aqui em
 * três coisas concretas que o usuário entende na hora:
 *
 *   forma      que tipo de apresentação aquilo vira (cartaz, clássica, jornada)
 *   composição quantas capas, capítulos, slides de conteúdo e fechamento
 *   duração    quanto tempo de fala aquilo representa
 *
 * E, antes de tudo, o sistema SUGERE um número lido do próprio briefing, com o
 * motivo em uma linha. O usuário escolhe, mas nunca escolhe no escuro.
 *
 * Módulo puro: sem React, sem DOM. Toda a UI do passo consome daqui.
 * SYNC_WITH: api/src/intelligence/generator.ts (regras de estrutura por
 * quantidade) e templates.ts (faixas narrativas). Este arquivo é o espelho
 * honesto dessas regras no front, então o preview nunca promete o que a geração
 * não entrega.
 */
import { SLIDE_COUNT_MAX, SLIDE_COUNT_MIN, type PresentationGoal } from '@/types/creation';

export function clampSlideCount(value: number): number {
  if (!Number.isFinite(value)) return SLIDE_COUNT_MIN;
  return Math.min(SLIDE_COUNT_MAX, Math.max(SLIDE_COUNT_MIN, Math.round(value)));
}

/* -------------------------------------------------------------------------- */
/* Forma narrativa                                                             */
/* -------------------------------------------------------------------------- */

export interface SlideForm {
  /** Menor quantidade que ainda pertence a esta forma. */
  from: number;
  label: string;
  /** O que essa quantidade permite contar. Aparece embaixo do número, ao vivo. */
  meaning: string;
}

/** As faixas, da menor pra maior. `from` é sempre crescente. */
const FORMS: SlideForm[] = [
  {
    from: 1,
    label: 'Cartaz',
    meaning: 'Uma mensagem só, forte e autocontida. Nada de promessa de continuação.',
  },
  {
    from: 2,
    label: 'Essencial',
    meaning: 'O núcleo e nada mais. A mensagem central, uma sustentação e o próximo passo.',
  },
  {
    from: 5,
    label: 'Direto ao ponto',
    meaning: 'Um argumento inteiro, com começo, meio e fim, sem gordura.',
  },
  {
    from: 8,
    label: 'Clássica',
    meaning: 'Contexto, desenvolvimento, prova e fechamento respiram. É onde a maioria das apresentações vive.',
  },
  {
    from: 13,
    label: 'Em capítulos',
    meaning: 'A narrativa ganha partes, com separadores marcando cada virada.',
  },
  {
    from: 21,
    label: 'Jornada',
    meaning: 'Formato de workshop. Cada capítulo precisa de função própria, senão a atenção cai.',
  },
];

export function formOf(slideCount: number): SlideForm {
  const count = clampSlideCount(slideCount);
  let current = FORMS[0] as SlideForm;
  for (const form of FORMS) {
    if (count >= form.from) current = form;
  }
  return current;
}

/** Âncoras de cada forma: atalhos pra quem já sabe o formato que quer. */
export interface FormShortcut {
  label: string;
  count: number;
}

export const FORM_SHORTCUTS: FormShortcut[] = [
  { label: 'Cartaz', count: 1 },
  { label: 'Essencial', count: 4 },
  { label: 'Direto ao ponto', count: 6 },
  { label: 'Clássica', count: 10 },
  { label: 'Em capítulos', count: 16 },
];

/* -------------------------------------------------------------------------- */
/* Composição do deck                                                          */
/* -------------------------------------------------------------------------- */

export interface DeckComposition {
  cover: number;
  sections: number;
  content: number;
  closing: number;
}

/** Espelha a regra de separadores do gerador: nenhum abaixo de 8, um até 13, e
 *  a cada ~7 slides daí pra cima. */
function sectionCount(slideCount: number): number {
  if (slideCount < 8) return 0;
  if (slideCount < 14) return 1;
  return Math.min(6, Math.round((slideCount - 2) / 7));
}

export function composeDeck(slideCount: number): DeckComposition {
  const count = clampSlideCount(slideCount);
  if (count === 1) return { cover: 1, sections: 0, content: 0, closing: 0 };
  if (count === 2) return { cover: 1, sections: 0, content: 0, closing: 1 };
  const sections = sectionCount(count);
  return { cover: 1, sections, content: count - 2 - sections, closing: 1 };
}

export type SlideRole = 'cover' | 'section' | 'content' | 'closing';

/**
 * O deck na ordem em que ele existe, pra desenhar o preview ao vivo.
 *
 * O separador é o que fica ENTRE as partes, nunca logo depois da capa: um
 * divisor de capítulo colado na abertura só repete o que a capa já disse. Então
 * o conteúdo é dividido em grupos e os separadores caem nas emendas.
 */
export function deckSequence(slideCount: number): SlideRole[] {
  const { cover, sections, content, closing } = composeDeck(slideCount);
  const roles: SlideRole[] = [];

  if (cover > 0) roles.push('cover');

  const groups = sections + 1;
  const perGroup = Math.ceil(content / groups);
  let remaining = content;

  for (let group = 0; group < groups; group += 1) {
    if (group > 0) roles.push('section');
    const take = Math.min(perGroup, remaining);
    for (let i = 0; i < take; i += 1) roles.push('content');
    remaining -= take;
  }
  for (let i = 0; i < remaining; i += 1) roles.push('content');

  if (closing > 0) roles.push('closing');
  return roles;
}

/* -------------------------------------------------------------------------- */
/* Duração de fala                                                             */
/* -------------------------------------------------------------------------- */

/** Minutos por tipo de slide, em ritmo de apresentação real (mínimo e máximo). */
const PACE = {
  cover: [0.5, 0.75],
  section: [0.25, 0.5],
  content: [0.75, 1.35],
  closing: [0.5, 1],
} as const;

export interface SpeakingTime {
  min: number;
  max: number;
}

export function estimateSpeakingTime(slideCount: number): SpeakingTime {
  const deck = composeDeck(slideCount);
  const low =
    deck.cover * PACE.cover[0] +
    deck.sections * PACE.section[0] +
    deck.content * PACE.content[0] +
    deck.closing * PACE.closing[0];
  const high =
    deck.cover * PACE.cover[1] +
    deck.sections * PACE.section[1] +
    deck.content * PACE.content[1] +
    deck.closing * PACE.closing[1];
  return { min: Math.max(1, Math.round(low)), max: Math.max(2, Math.round(high)) };
}

export function formatSpeakingTime(time: SpeakingTime): string {
  if (time.min === time.max) return `cerca de ${time.min} minutos de fala`;
  return `cerca de ${time.min} a ${time.max} minutos de fala`;
}

/* -------------------------------------------------------------------------- */
/* Sugestão a partir do briefing                                               */
/* -------------------------------------------------------------------------- */

export interface SlideSuggestion {
  count: number;
  /** Uma linha explicando de onde saiu o número. O usuário nunca escolhe no escuro. */
  reason: string;
}

/** Ponto de partida por objetivo: capacitar pede espaço, inspirar pede corte. */
const GOAL_BASE: Record<PresentationGoal, number> = {
  convince: 9,
  inform: 8,
  inspire: 6,
  train: 12,
};

/** "quero 12 slides", "em 8 slides": pedido explícito ganha de qualquer heurística. */
function explicitCount(idea: string): number | null {
  const match = /\b(\d{1,2})\s*slides?\b/i.exec(idea);
  if (!match?.[1]) return null;
  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isFinite(parsed) || parsed < SLIDE_COUNT_MIN || parsed > SLIDE_COUNT_MAX) return null;
  return parsed;
}

/**
 * Quantos assuntos distintos o briefing carrega.
 *
 * Quem já pensou na estrutura escreve em blocos: um parágrafo ou um item de
 * lista por assunto. Então um briefing organizado é lido pelos blocos dele. Só
 * texto corrido, sem blocos, cai na contagem de frases, que é o melhor sinal
 * que sobra. Contar frase num texto já dividido em parágrafos inflaria o número
 * (cada parágrafo tem várias frases sobre o MESMO assunto).
 */
function countTopics(idea: string): number {
  const text = idea.trim();
  if (text.length === 0) return 0;

  const listItems = text.split(/\n/).filter((line) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(line)).length;

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 20).length;

  if (paragraphs >= 3 || listItems >= 3) return Math.max(paragraphs, listItems);

  return text
    .split(/[.!?;]+|\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 12).length;
}

/**
 * O número que o sistema recomenda pra ESTA ideia. Nunca sugere um cartaz por
 * conta própria: um slide só é uma decisão editorial, não um acidente de
 * briefing curto.
 */
export function suggestSlideCount(idea: string, goal: PresentationGoal | null): SlideSuggestion {
  const asked = explicitCount(idea);
  if (asked !== null) {
    return {
      count: asked,
      reason: `Você citou ${asked} ${asked === 1 ? 'slide' : 'slides'} no briefing, então mantive.`,
    };
  }

  const base = goal ? GOAL_BASE[goal] : 8;
  const topics = countTopics(idea);

  let count = base;
  let reason: string;

  if (topics === 0) {
    reason = 'Ponto de partida da casa. Ajuste conforme o peso do seu conteúdo.';
  } else if (topics <= 3) {
    count = base - 2;
    reason = 'Seu briefing tem poucos assuntos, então um deck enxuto sustenta melhor a atenção.';
  } else if (topics <= 6) {
    reason = 'Essa quantidade dá um slide pra cada assunto do briefing, com espaço pra abrir e fechar.';
  } else if (topics <= 10) {
    count = base + 3;
    reason = 'Seu briefing traz bastante coisa, então abri espaço pra cada ponto respirar.';
  } else {
    count = base + 5;
    reason = 'O briefing é denso. Com esse espaço, nenhum assunto precisa dividir slide com outro.';
  }

  return { count: Math.min(20, Math.max(3, count)), reason };
}
