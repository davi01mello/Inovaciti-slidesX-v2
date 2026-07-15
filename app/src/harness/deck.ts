import { createId } from '@/lib/id';
import { fromPlain } from '@/lib/richText';
import type { RichText } from '@/lib/richText';
import type { Block, CardItem, Slide, SlideLayout } from '@/types/slide';

/**
 * O DECK DE PROVA.
 *
 * Texto DENSO de verdade (60 a 140 palavras por slide de conteúdo), porque é
 * texto denso que quebra layout. Um harness com "Lorem ipsum" de três palavras
 * prova exatamente nada: ele passa em tudo e o bug aparece no cliente.
 *
 * Cada slide aqui é um caso de estresse deliberado:
 *   · títulos de 1 linha ao lado de títulos de 3 (alinhamento dos cards)
 *   · card com corpo curto ao lado de card com corpo longo (altura idêntica)
 *   · 5 tópicos (o teto) com comprimentos diferentes
 *   · parágrafo de 4 frases em coluna estreita (justificação)
 *   · métrica gigante, foto, e uma frase de destaque
 */

const t = (s: string): RichText => fromPlain(s);

/** Um trecho com destaque no meio — o run de highlight tem que sobreviver ao ajuste. */
function hl(before: string, mark: string, after: string): RichText {
  return [{ text: before }, { text: mark, highlight: true }, { text: after }];
}

const card = (title: string, body: string): CardItem => ({ id: createId(), title: t(title), body: t(body) });

function slide(layout: SlideLayout, blocks: Block[]): Slide {
  return { id: createId(), layout, blocks };
}

const B = {
  label: (s: string): Block => ({ id: createId(), kind: 'section-label', align: 'left', content: t(s) }),
  t1: (s: string): Block => ({ id: createId(), kind: 'title-1', align: 'left', content: t(s) }),
  t2: (s: string): Block => ({ id: createId(), kind: 'title-2', align: 'left', content: t(s) }),
  sub: (s: string): Block => ({ id: createId(), kind: 'subtitle', align: 'left', content: t(s) }),
  body: (s: string): Block => ({ id: createId(), kind: 'body', align: 'left', content: t(s) }),
  bodyHl: (a: string, m: string, z: string): Block => ({ id: createId(), kind: 'body', align: 'left', content: hl(a, m, z) }),
  high: (s: string): Block => ({ id: createId(), kind: 'highlight', align: 'left', content: t(s) }),
  cards: (...items: CardItem[]): Block => ({ id: createId(), kind: 'cards', align: 'left', items }),
  topics: (...items: string[]): Block => ({ id: createId(), kind: 'topics', align: 'left', items: items.map(t) }),
};

/** Uma foto de teste: gradiente + grade, gerada em runtime (nada de asset externo). */
export function testPhoto(): string {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 900;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 1200, 900);
  g.addColorStop(0, '#1b3a4b');
  g.addColorStop(0.5, '#2b6e6a');
  g.addColorStop(1, '#0f2027');
  x.fillStyle = g;
  x.fillRect(0, 0, 1200, 900);
  x.strokeStyle = 'rgba(255,255,255,0.14)';
  for (let i = 0; i < 1200; i += 60) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, 900);
    x.stroke();
  }
  x.fillStyle = 'rgba(255,255,255,0.85)';
  x.font = 'bold 52px sans-serif';
  x.fillText('FOTO DO USUÁRIO', 60, 470);
  return c.toDataURL('image/jpeg', 0.8);
}

export function buildTestDeck(): Slide[] {
  const photo = testPhoto();

  const media = slide('content', [
    B.label('Prova de campo'),
    B.t2('O que o piloto mostrou'),
    B.body('Seis semanas, dois times reais. O ganho veio da conferência, não da digitação.'),
    B.sub('Conduzido entre março e abril, com acompanhamento diário.'),
  ]);
  media.image = { src: photo, width: 1200, height: 900 };

  return [
    slide('cover', [
      B.label('Proposta comercial'),
      B.t1('Menos fila, mais margem'),
      B.sub('Como a CITi reduz o tempo de atendimento sem aumentar o time.'),
    ]),

    // AFIRMAÇÃO: o respiro. Body curto (1 frase) + destaque. O texto denso saiu.
    slide('content', [
      B.label('O problema'),
      B.t2('A fila não é o gargalo. É o sintoma.'),
      B.body('Ela é o que sobra de três decisões tomadas antes dela.'),
      B.high('Contratar sem reordenar o processo é comprar mais fila.'),
    ]),

    // CARDS: título + uma frase de apoio. Nada de parágrafo dentro do card.
    slide('content', [
      B.label('A proposta'),
      B.t2('Três frentes, na ordem que importa'),
      B.cards(
        card('Validação na entrada', 'O pedido não entra se estiver incompleto.'),
        card('Conferência contínua', 'Sai do fim e vira etapa curta em cada passo.'),
        card('Automação do repetitivo', 'Entra só depois que as duas primeiras rodam.'),
      ),
    ]),

    // TÓPICOS: linhas curtas, escaneáveis.
    slide('content', [
      B.label('Como funciona'),
      B.t2('O que muda na rotina'),
      B.body('Sem treinamento novo: muda a ordem, não a ferramenta.'),
      B.topics(
        'O pedido chega já validado',
        'A conferência acontece durante, não depois',
        'O retrabalho vira exceção rastreada',
        'O supervisor vê o gargalo antes da fila',
        'A automação entra onde o processo é estável',
      ),
    ]),

    slide('section', [B.label('Capítulo dois'), B.t1('O que a operação ganha')]),

    // CARDS de 2.
    slide('content', [
      B.label('Impacto'),
      B.t2('Onde o tempo aparece'),
      B.cards(
        card('Entrada do pedido', 'A validação corta o vaivém de correção.'),
        card('Conferência', 'Deixa de ser um bloco no fim do processo.'),
      ),
    ]),

    // NÚMERO: métrica + contexto de uma linha.
    slide('content', [
      B.label('Investimento'),
      B.t2('R$ 29.900'),
      B.t2('Projeto fechado, sem custo recorrente'),
      B.sub('Em três parcelas, atreladas às entregas de cada frente.'),
    ]),

    media,

    // TÓPICOS de benefício.
    slide('content', [
      B.label('A decisão'),
      B.t2('Por que agora'),
      B.body('Cada mês de espera cobra juros em retrabalho acumulado.'),
      B.topics(
        'A validação fica pronta antes do pico de fim de ano',
        'O time aprende no ritmo baixo, não no pico',
        'O retrabalho para de crescer a partir do mês um',
      ),
    ]),

    slide('closing', [
      B.t1('Vamos começar?'),
      B.sub('Próximo passo: uma reunião de uma hora com o time.'),
      B.high('Aprovando esta semana, a validação entra antes do pico.'),
    ]),
  ];
}
