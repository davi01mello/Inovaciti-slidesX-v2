import { toPlain } from '@/lib/richText';
import type { Archetype } from '@/services/artZones';
import {
  isListBlock,
  type Block,
  type CardsBlock,
  type CompareBlock,
  type Slide,
  type StatsBlock,
  type StepsBlock,
  type TextBlock,
  type TopicsBlock,
} from '@/types/slide';

/**
 * QUAL PAPEL ESTE SLIDE CUMPRE.
 *
 * A parte pura do motor: lê o conteúdo do slide e decide qual dos 13 arquétipos
 * ele é, e qual bloco ocupa qual papel semântico dentro dele. Não sabe nada de
 * pixel, de arte ou de cor — isso é do artZones/deckArt.
 *
 * O arquétipo é INFERIDO dos blocos, nunca declarado e persistido: assim a edição
 * manual do usuário (apagar a lista, virar afirmação) muda o desenho na hora, sem
 * deixar um rótulo velho pra trás.
 *
 * A ordem das perguntas importa, e ela é a hierarquia editorial do produto:
 * primeiro o papel estrutural que o autor pediu (capa, separador, fecho), depois
 * a FOTO (que é conteúdo e manda no slide inteiro), depois os blocos que definem
 * formato (compare, stats, steps), depois a forma do conteúdo.
 */

export interface ComposedSlide {
  archetype: Archetype;
  /** Rótulo pequeno em maiúsculas. */
  label: TextBlock | null;
  /** O título principal. */
  headline: TextBlock | null;
  /** Valor curto com número (LEGADO: decks antigos com title-3 métrico). */
  metric: TextBlock | null;
  /** O texto de apoio em prosa, curto. */
  body: TextBlock | null;
  /** Uma linha que completa o título. */
  subtitle: TextBlock | null;
  /** Frase de síntese, com destaque visual. */
  highlight: TextBlock | null;
  /** A lista, quando existir. Nunca dois tipos de lista no mesmo slide. */
  cards: CardsBlock | null;
  topics: TopicsBlock | null;
  /** Métricas: 1 item vira número gigante (bignumber), 2 a 4 viram painel (kpis). */
  stats: StatsBlock | null;
  /** Etapas em sequência: timeline numerada. */
  steps: StepsBlock | null;
  /** Dois lados frente a frente. */
  compare: CompareBlock | null;
  /** Textos extras que o usuário inseriu à mão e não cabem em nenhum papel acima. */
  extra: TextBlock[];
}

function isTitleKind(block: Block): block is TextBlock {
  return block.kind === 'title-1' || block.kind === 'title-2' || block.kind === 'title-3';
}

/** Valor curto COM dígito (preço, percentual, múltiplo) — é isso que pede o número gigante. */
function isShortMetric(block: TextBlock): boolean {
  const text = toPlain(block.content).trim();
  return text.length > 0 && text.length <= 18 && /\d/.test(text);
}

function firstOf(blocks: Block[], kind: TextBlock['kind']): TextBlock | null {
  return (blocks.find((b) => b.kind === kind) as TextBlock | undefined) ?? null;
}

/**
 * O arquétipo do slide.
 *
 * `split` merece uma nota: ele existe pra quando o slide tem contexto em prosa E
 * uma lista. Empilhar os dois verticalmente esmaga os dois; lado a lado, cada um
 * respira. O formato `split` do catálogo (body + lista) cai aqui.
 */
function pickArchetype(slide: Slide, plan: Omit<ComposedSlide, 'archetype'>): Archetype {
  switch (slide.layout) {
    case 'cover':
      return 'cover';
    case 'section':
      return 'section';
    case 'closing':
      return 'closing';
    default:
      break;
  }

  // A foto é CONTEÚDO e manda no slide: ela ocupa uma coluna inteira.
  if (slide.image) return 'media';

  // Blocos que definem formato sozinhos.
  if (plan.compare) return 'compare';
  if (plan.stats) return plan.stats.items.length === 1 ? 'bignumber' : 'kpis';
  if (plan.steps) return 'timeline';

  const hasList = !!plan.cards || !!plan.topics;

  /**
   * O `split` só existe se o APOIO couber numa coluna.
   *
   * TRÊS cards com corpo numa coluna de meia tela viram três tiras espremidas com
   * hifenização em toda linha. Três cards querem a LARGURA INTEIRA, e o arquétipo
   * `cards` dá isso (o texto de apoio vai pro header, junto do título). O `split`
   * fica pros apoios que genuinamente cabem numa coluna: tópicos (uma linha cada)
   * ou dois cards.
   */
  const asideFitsColumn = !!plan.topics || (plan.cards?.items.length ?? 0) <= 2;

  // Formato `split` do catálogo: contexto em prosa + lista, lado a lado.
  if (hasList && plan.body && asideFitsColumn) return 'split';
  if (plan.cards) return 'cards';
  if (plan.topics) return 'topics';
  if (plan.metric) return 'bignumber'; // legado: decks antigos com dois títulos
  // Formato `citacao`: manchete + frase de síntese, sem prosa nem lista.
  if (plan.highlight && !plan.body) return 'quote';
  return 'statement';
}

/**
 * Analisa o slide e devolve o plano de composição.
 *
 * Caixas de texto flutuantes (block.floating) ficam FORA: são camada livre por
 * cima da arte, posicionadas pelo usuário (ver FloatingTextLayer).
 */
export function composeSlide(slide: Slide): ComposedSlide {
  const blocks = slide.blocks.filter((b) => isListBlock(b) || !b.floating);

  const cards = (blocks.find((b) => b.kind === 'cards') as CardsBlock | undefined) ?? null;
  const topics = cards ? null : ((blocks.find((b) => b.kind === 'topics') as TopicsBlock | undefined) ?? null);
  const stats = (blocks.find((b) => b.kind === 'stats') as StatsBlock | undefined) ?? null;
  const steps = (blocks.find((b) => b.kind === 'steps') as StepsBlock | undefined) ?? null;
  const compare = (blocks.find((b) => b.kind === 'compare') as CompareBlock | undefined) ?? null;

  const label = firstOf(blocks, 'section-label');
  const highlight = firstOf(blocks, 'highlight');
  const body = firstOf(blocks, 'body');
  const subtitle = firstOf(blocks, 'subtitle');

  const titles = blocks.filter(isTitleKind);

  // Métrica LEGADA só quando ela NÃO é o único título: um preço sozinho é o título
  // do slide, não um número em destaque órfão de manchete. Decks novos usam stats.
  let metric: TextBlock | null = null;
  let headline: TextBlock | null = null;
  if (slide.layout === 'content' && !cards && !topics && !stats && titles.length > 1) {
    metric = titles.find(isShortMetric) ?? null;
  }
  headline = titles.find((t) => t !== metric) ?? null;

  const claimed = new Set<Block>(
    [label, highlight, body, subtitle, headline, metric, cards, topics, stats, steps, compare].filter(
      Boolean,
    ) as Block[],
  );
  const extra = blocks.filter((b): b is TextBlock => !isListBlock(b) && !claimed.has(b));

  const plan = { label, headline, metric, body, subtitle, highlight, cards, topics, stats, steps, compare, extra };
  return { archetype: pickArchetype(slide, plan), ...plan };
}

/** O papel de cada slide do deck, na ordem — é o que o diretor de arte recebe. */
export function deckRoles(slides: Slide[]): { id: string; archetype: Archetype }[] {
  return slides.map((slide) => ({ id: slide.id, archetype: composeSlide(slide).archetype }));
}
