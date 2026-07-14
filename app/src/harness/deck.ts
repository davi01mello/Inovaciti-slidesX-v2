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
    B.t2('O que a medição mostrou no piloto'),
    B.body(
      'Rodamos o piloto por seis semanas com dois times reais, sem avisar o resto da operação. O ganho não veio de onde a gente esperava: quase todo o tempo economizado saiu da etapa de conferência, não da digitação. Isso muda a ordem do roadmap, porque a conferência era o item que estava previsto pro final. Trazemos ela pra frente.',
    ),
    B.sub('Piloto conduzido entre março e abril, com acompanhamento diário.'),
  ]);
  media.image = { src: photo, width: 1200, height: 900 };

  return [
    slide('cover', [
      B.label('Proposta comercial'),
      B.t1('Menos fila, mais margem'),
      B.sub('Como a CITi reduz o tempo de atendimento sem aumentar o time.'),
    ]),

    slide('content', [
      B.label('O problema'),
      B.t2('A fila não é o gargalo. É o sintoma.'),
      B.bodyHl(
        'Todo mundo olha pra fila porque ela é visível, mas a fila é o que sobra de três decisões tomadas antes dela. O pedido entra sem validação, a conferência acontece no fim e o retrabalho volta pro começo. Enquanto essas três coisas continuarem nessa ordem, contratar mais gente só ',
        'aumenta a fila mais rápido',
        '. O que a gente propõe mexe na ordem, não no tamanho do time.',
      ),
      B.high('Contratar sem reordenar o processo é comprar mais fila, mais caro.'),
    ]),

    slide('content', [
      B.label('A proposta'),
      B.t2('Três frentes, na ordem que importa'),
      B.body(
        'A ordem aqui não é estética: cada frente só funciona se a anterior já estiver de pé. Validar na entrada é o que torna a conferência barata; a conferência barata é o que torna a automação segura. Invertendo, a automação só acelera o erro.',
      ),
      B.cards(
        card(
          'Validação na entrada',
          'O pedido não entra se estiver incompleto. Um formulário que recusa na hora custa segundos; um pedido errado que atravessa a operação custa dias.',
        ),
        card('Conferência contínua', 'Sai do fim e vira etapa curta em cada passo.'),
        card(
          'Automação do repetitivo',
          'Só depois que os dois acima estiverem rodando. Automatizar um processo errado é fazer o erro chegar mais rápido, e foi o que aconteceu na tentativa anterior do time interno.',
        ),
      ),
    ]),

    slide('content', [
      B.label('Como funciona'),
      B.t2('O que muda na rotina de quem atende'),
      B.body(
        'Nada do que está abaixo exige treinamento novo. São mudanças de ordem e de gatilho, não de ferramenta. O time continua usando o mesmo sistema que já usa hoje.',
      ),
      B.topics(
        'O pedido chega já validado, sem campo em branco',
        'A conferência acontece durante, não depois',
        'O retrabalho vira exceção rastreada, não rotina',
        'O supervisor vê o gargalo antes de ele virar fila',
        'A automação entra só onde o processo já está estável',
      ),
    ]),

    slide('section', [B.label('Capítulo dois'), B.t1('O que a operação ganha com isso')]),

    slide('content', [
      B.label('Impacto'),
      B.t2('Onde o tempo economizado aparece'),
      B.body(
        'O ganho não é distribuído por igual, e é importante dizer isso antes de prometer número. A maior parte da economia se concentra em duas etapas, e as outras seguem exatamente como estão hoje. Prometer ganho uniforme seria mais fácil de vender e mais difícil de entregar.',
      ),
      B.cards(
        card('Entrada do pedido', 'A validação corta o vaivém de correção, que hoje é a etapa mais cara em tempo de gente.'),
        card('Conferência', 'Deixa de ser um bloco no fim e vira verificação curta, embutida em cada passo.'),
      ),
    ]),

    slide('content', [
      B.label('Números'),
      B.t2('R$ 29.900'),
      B.t2('Investimento total do projeto'),
      B.body(
        'O valor cobre as três frentes, a implantação e oito semanas de acompanhamento com o time. Não há custo recorrente de licença: o que a gente entrega roda na infraestrutura que vocês já pagam. O pagamento acompanha as entregas, não o calendário.',
      ),
      B.sub('Pagamento em três parcelas, atreladas às entregas de cada frente.'),
    ]),

    media,

    slide('content', [
      B.label('A decisão'),
      B.t2('Por que agora e não no próximo trimestre'),
      B.body(
        'O custo de esperar não é zero, e ele não é linear. Cada mês de fila é um mês de retrabalho acumulado, e o retrabalho tem juros: um pedido corrigido três vezes já passou por três pessoas diferentes. Começar agora significa que a validação está de pé antes do pico de fim de ano, que é exatamente quando a fila deixa de ser um incômodo e passa a ser perda de cliente.',
      ),
      B.high('Esperar um trimestre não adia o custo. Ele cobra juros.'),
    ]),

    slide('closing', [
      B.t1('Vamos começar?'),
      B.sub('Próximo passo: uma reunião de uma hora com o time de operação.'),
      B.high('Se aprovarem esta semana, a validação entra em produção antes do pico.'),
    ]),
  ];
}
