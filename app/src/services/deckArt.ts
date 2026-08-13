/**
 * O DIRETOR DE ARTE DO DECK.
 *
 * Um designer humano NÃO sorteia o fundo de cada slide. Ele escolhe uma família
 * visual pra apresentação inteira e distribui as peças ao longo da jornada.
 *
 * Então este módulo não recebe um slide: recebe o DECK INTEIRO de uma vez, e
 * devolve qual arte vai em cada slide. É essa visão de conjunto que permite as
 * duas coisas que pareciam brigar:
 *
 *   VARIEDADE   nenhuma arte se repete enquanto houver arte nova elegível, e
 *               dois vizinhos não caem no mesmo arranjo.
 *   COERÊNCIA   todas saem da mesma faixa do eixo de cor, então a apresentação
 *               inteira conversa: ninguém troca de identidade no meio do caminho.
 *
 * Tudo determinístico a partir de (id da apresentação, tone, slides). Nada de
 * Math.random(): palco, miniatura, apresentação e export TÊM que renderizar o
 * mesmo pixel. E dois decks com o mesmo briefing saem com capas diferentes,
 * porque o id da apresentação entra no sorteio.
 */
import { composeAll, composeArt, fitFromCost, type Archetype } from '@/services/artZones';
import { TEMPLATE_ARTS, type ArtFamily, type TemplateArt } from '@/services/templateArt.generated';

/* -------------------------------------------------------------------------- */
/* Pesos                                                                       */
/* -------------------------------------------------------------------------- */

const W_COLOR = 1.15; // afinidade de cor: a coerência do deck
const W_FIT = 1.7; //   encaixe medido: a legibilidade
const W_FAMILY = 0.75; // aptidão da família: capa=herói, canvas=miolo, espiral/diva=virada
const W_NOISE = 0.14; // desempate estável

const P_SAME_ARRANGEMENT = 0.3; // vizinho com o mesmo desenho: o que mais salta aos olhos
const P_ARRANGEMENT_USED = 0.24; // desenho já usado LÁ ATRÁS: incomoda menos, mas incomoda
// (maior que SHORTLIST_BAND de propósito: um desenho repetido tem que CAIR da lista curta,
//  não continuar empatado nela — senão o sorteio de variedade escolhe justo a repetição.)
const P_SAME_FAMILY = 0.06; // duas artes seguidas da mesma família
const P_REUSED = 0.85; // arte já usada neste deck

/**
 * O encaixe pesa MAIS que a cor, de propósito: um slide ilegível na cor exata não
 * serve pra nada, e um slide legível um tom fora ninguém percebe.
 */

/**
 * Aptidão de cada família pra cada papel. É o que impede uma capa dramática de
 * virar canvas. DIVA entra com o mesmo perfil de ESPIRAL — mesma natureza
 * visual (render 3D abstrato de página inteira, sem miolo vazio pra conteúdo
 * denso), só que na paleta rosa em vez da verde/teal.
 */
const FAMILY_FIT: Record<Archetype, Record<ArtFamily, number>> = {
  cover: { capa: 1, espiral: 0.55, diva: 0.55, canvas: 0.2 },
  closing: { capa: 0.95, espiral: 0.6, diva: 0.6, canvas: 0.25 },
  section: { espiral: 1, diva: 1, capa: 0.72, canvas: 0.35 },
  statement: { capa: 0.85, espiral: 0.75, diva: 0.75, canvas: 0.6 },
  // Citação é um statement de impacto: UM bloco de texto grande, arte dramática serve.
  quote: { capa: 0.85, espiral: 0.8, diva: 0.8, canvas: 0.6 },
  bignumber: { canvas: 0.9, capa: 0.7, espiral: 0.7, diva: 0.7 },
  kpis: { canvas: 1, espiral: 0.5, diva: 0.5, capa: 0.35 },
  cards: { canvas: 1, espiral: 0.45, diva: 0.45, capa: 0.3 },
  topics: { canvas: 1, espiral: 0.5, diva: 0.5, capa: 0.35 },
  compare: { canvas: 1, espiral: 0.45, diva: 0.45, capa: 0.3 },
  timeline: { canvas: 1, espiral: 0.5, diva: 0.5, capa: 0.35 },
  split: { canvas: 1, espiral: 0.45, diva: 0.45, capa: 0.3 },
  media: { canvas: 1, espiral: 0.4, diva: 0.4, capa: 0.3 },
};

/**
 * ARTE CLARA É PEÇA DE HERÓI, não canvas.
 *
 * Uma arte de página inteira clara só funciona onde existe UM bloco de texto
 * grande. Num slide denso (três cards, cinco tópicos, foto e parágrafo) ela
 * compete com o conteúdo e NENHUM véu resolve: velar a arte inteira até o texto
 * aparecer é o mesmo que não ter arte. Melhor bloquear.
 */
const LIGHT_ART_ALLOWED = new Set<Archetype>(['cover', 'section', 'statement', 'quote', 'closing']);

/* -------------------------------------------------------------------------- */
/* Determinismo                                                                */
/* -------------------------------------------------------------------------- */

/** FNV-1a: hash estável, mesmo resultado em qualquer máquina e qualquer render. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Ruído estável em 0..1. Mesmo (seed, slide, arte) → mesmo número, pra sempre. */
function noise(seed: string, slideId: string, artId: string): number {
  return hash(`${seed}|${slideId}|${artId}`) / 0x100000000;
}

/* -------------------------------------------------------------------------- */
/* A faixa de cor                                                              */
/* -------------------------------------------------------------------------- */

const BAND_START = 0.18;
const BAND_STEP = 0.1;

/**
 * As artes elegíveis pra este tom, com a faixa ALARGADA até haver material de sobra.
 *
 * A coleção não é uniforme: 29 artes caem no Verde, 8 no Azul e UMA no
 * Gelo. Uma faixa fixa em volta de tone=0 acharia uma arte só, e o deck sairia
 * repetindo a mesma capa três vezes. Melhor um deck levemente fora do tom exato
 * que um deck repetido — então a faixa cresce até caber o deck com folga.
 */
function eligibleArts(tone: number, archetype: Archetype, need: number): TemplateArt[] {
  const pool = TEMPLATE_ARTS.filter(
    // Diva fica de fora do sorteio automático de propósito: o eixo de tom (tone.ts)
    // foi calibrado pro espectro Gelo→Azul→Verde da marca, e o rosa não tem posição
    // real nele -- na prática toda peça Diva mede tom perto de 0 (Gelo), então com o
    // slider em Gelo (que já tem pouquíssimo material próprio) ela dominava o sorteio
    // por afinidade de cor, e o deck saía rosa sem o usuário ter pedido isso. A família
    // continua 100% disponível pela escolha manual na aba Fundos (ver InsertDock.tsx),
    // que não passa por aqui -- só o sorteio automático por tom é que a ignora.
    (art) => art.family !== 'diva' && (!art.light || LIGHT_ART_ALLOWED.has(archetype)),
  );

  for (let half = BAND_START; half <= 1.4; half += BAND_STEP) {
    const band = pool.filter((art) => Math.abs(art.tone - tone) <= half);
    if (band.length >= need) return band;
  }
  return pool;
}

/* -------------------------------------------------------------------------- */
/* O plano                                                                     */
/* -------------------------------------------------------------------------- */

export interface DeckSlideRole {
  id: string;
  archetype: Archetype;
  /** Escolha manual do fundo (Slide.artOverride). Presente = pula o sorteio pra este slide. */
  artOverride?: string;
}

export interface ArtChoice {
  artId: string;
  arrangementId: string;
  /**
   * A SEMENTE DE VARIAÇÃO VISUAL do slide (0..7). É ela que faz dois slides de
   * cards no MESMO deck saírem com desenhos de card DIFERENTES (painel numerado,
   * ícone-herói, contorno com barra), duas listas saírem com marcadores
   * diferentes, e assim por diante. Slides consecutivos do mesmo arquétipo
   * recebem flavors consecutivos — repetição de desenho vira impossível, não
   * improvável. Cada deck começa num offset próprio (o id entra no hash), então
   * dois decks com o mesmo briefing também não saem gêmeos.
   */
  flavor: number;
}

/** Flavor estável pra um slide fora de um plano de deck (miniatura solta, fallback). */
export function fallbackFlavor(slideId: string): number {
  return hash(`flavor|${slideId}`) % 8;
}

/**
 * Quanto uma arte pode pontuar abaixo da melhor e ainda ser considerada "tão boa
 * quanto". Dentro dessa faixa o desempate é o id da apresentação.
 */
const SHORTLIST_BAND = 0.14;

interface Candidate {
  art: TemplateArt;
  arrangementId: string;
  score: number;
}

/**
 * ENTRE AS QUE EMPATAM, QUEM DECIDE É O ID DA APRESENTAÇÃO.
 *
 * O ruído estável sozinho não bastava: ele só vira o jogo quando duas artes estão
 * a menos de 0.14 de distância NA PONTUAÇÃO FINAL, e medindo eu vi dois briefings
 * idênticos com seeds diferentes caírem na MESMA capa — porque uma capa vencia as
 * outras com folga maior que o ruído. O deck ficava "ótimo" e previsível.
 *
 * A lista curta resolve pelo lado certo: primeiro o motor decide QUAIS artes
 * servem (e uma arte ruim jamais entra na lista), depois o id escolhe entre elas.
 * É literalmente o que um designer faz quando diz "qualquer uma dessas cinco capas
 * funciona, vai essa". Variedade real, sem nunca sacrificar o encaixe.
 */
function pickFromShortlist(scored: Candidate[], seed: string, slideId: string): Candidate {
  let best = scored[0]!;
  for (const candidate of scored) {
    if (candidate.score > best.score) best = candidate;
  }
  const cut = best.score - SHORTLIST_BAND;
  const shortlist = scored.filter((c) => c.score >= cut);
  return shortlist[hash(`${seed}|${slideId}|pick`) % shortlist.length] ?? best;
}

/**
 * Qual arte vai em cada slide do deck.
 *
 * Guloso, slide a slide, na ordem da narrativa: cada escolha já sabe o que veio
 * antes (e por isso consegue fugir do vizinho), e o determinismo vem do id, não
 * da ordem de avaliação.
 */
export function planDeckArt(
  seed: string,
  tone: number,
  slides: DeckSlideRole[],
): Map<string, ArtChoice> {
  const plan = new Map<string, ArtChoice>();
  if (slides.length === 0) return plan;

  // Folga: mais candidatas que slides, senão as últimas escolhas ficam sem opção
  // e a penalidade de repetição não tem como ser paga.
  const need = Math.min(TEMPLATE_ARTS.length, Math.max(6, Math.ceil(slides.length * 1.6)));

  const usedArts = new Set<string>();
  const usedArrangements = new Set<string>();
  // Contador de flavor POR ARQUÉTIPO: o primeiro slide de cards do deck sai num
  // desenho, o segundo no seguinte, o terceiro no outro — nunca dois iguais em
  // sequência. O offset por deck vem do id da apresentação.
  const flavorCount = new Map<Archetype, number>();
  let prevArrangement = '';
  let prevFamily: ArtFamily | '' = '';

  for (const slide of slides) {
    // Escolha MANUAL: pula o sorteio, mas o motor ainda escolhe o melhor ARRANJO
    // pra ela (como o texto encaixa) e ela ainda entra em usedArts/usedArrangements
    // pra baixo, então o resto do deck continua fugindo dela normalmente.
    const overrideArt = slide.artOverride ? BY_ID.get(slide.artOverride) : undefined;
    const pool = overrideArt ? [overrideArt] : eligibleArts(tone, slide.archetype, need);

    const scored: Candidate[] = [];

    for (const art of pool) {
      // O que NÃO depende do arranjo, calculado uma vez só.
      const colorAffinity = 1 - Math.abs(art.tone - tone);
      const familyFit = FAMILY_FIT[slide.archetype][art.family];
      let base =
        colorAffinity * W_COLOR +
        familyFit * W_FAMILY +
        noise(seed, slide.id, art.id) * W_NOISE;
      if (art.family === prevFamily) base -= P_SAME_FAMILY;
      if (usedArts.has(art.id)) base -= P_REUSED;

      // Cada ARRANJO desta arte é um candidato próprio: assim o motor pode usar o
      // segundo melhor desenho de uma arte boa em vez de repetir um desenho já visto.
      let best: Candidate | null = null;
      for (const composition of composeAll(art, slide.archetype)) {
        let score = base + fitFromCost(composition.cost) * W_FIT;
        if (composition.arrangementId === prevArrangement) score -= P_SAME_ARRANGEMENT;
        else if (usedArrangements.has(composition.arrangementId)) score -= P_ARRANGEMENT_USED;
        if (!best || score > best.score) {
          best = { art, arrangementId: composition.arrangementId, score };
        }
      }
      // Uma entrada por ARTE (não por arranjo): senão uma arte com cinco desenhos bons
      // teria cinco bilhetes no sorteio da lista curta e o "acaso" deixaria de ser justo.
      if (best) scored.push(best);
    }

    // Só acontece se o catálogo estiver vazio — mas o tipo não sabe disso.
    if (scored.length === 0) continue;

    const chosen = pickFromShortlist(scored, seed, slide.id);
    const seen = flavorCount.get(slide.archetype) ?? 0;
    flavorCount.set(slide.archetype, seen + 1);
    const flavor = (hash(`${seed}|flavor|${slide.archetype}`) + seen) % 8;
    plan.set(slide.id, { artId: chosen.art.id, arrangementId: chosen.arrangementId, flavor });
    usedArts.add(chosen.art.id);
    usedArrangements.add(chosen.arrangementId);
    prevArrangement = chosen.arrangementId;
    prevFamily = chosen.art.family;
  }

  return plan;
}

/* -------------------------------------------------------------------------- */
/* Acesso                                                                      */
/* -------------------------------------------------------------------------- */

const BY_ID = new Map(TEMPLATE_ARTS.map((art) => [art.id, art]));

export function artById(id: string): TemplateArt | undefined {
  return BY_ID.get(id);
}

/**
 * A arte de um slide, quando o plano do deck não está à mão (miniatura solta,
 * card da home, render de um slide fora de contexto). Cai numa escolha estável
 * pelo próprio id do slide — nunca num Math.random().
 */
export function fallbackArt(slideId: string, tone: number, archetype: Archetype): TemplateArt {
  const pool = eligibleArts(tone, archetype, 4);
  const list = pool.length > 0 ? pool : TEMPLATE_ARTS;
  return list[hash(slideId) % list.length] ?? TEMPLATE_ARTS[0]!;
}

/** As capas que este tom traz — é o preview ao vivo da barra de cor. */
export function coversForTone(tone: number, count = 3): TemplateArt[] {
  return eligibleArts(tone, 'cover', count + 3)
    .slice()
    .sort((a, b) => {
      const byColor = Math.abs(a.tone - tone) - Math.abs(b.tone - tone);
      if (Math.abs(byColor) > 0.0001) return byColor;
      return fitFromCost(composeArt(b, 'cover').cost) - fitFromCost(composeArt(a, 'cover').cost);
    })
    .slice(0, count);
}
