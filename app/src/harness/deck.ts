import { createId } from '@/lib/id';
import { fromPlain } from '@/lib/richText';
import type { RichText } from '@/lib/richText';
import type { Block, CardItem, CompareSide, Slide, SlideIconName, SlideLayout, StatItem } from '@/types/slide';

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

const card = (title: string, body: string, icon?: SlideIconName): CardItem => ({
  id: createId(),
  title: t(title),
  body: t(body),
  ...(icon ? { icon } : {}),
});
const stat = (value: string, label: string, icon?: SlideIconName): StatItem => ({
  id: createId(),
  value: t(value),
  label: t(label),
  ...(icon ? { icon } : {}),
});
const side = (label: string, icon: SlideIconName | undefined, ...points: string[]): CompareSide => ({
  id: createId(),
  label: t(label),
  points: points.map(t),
  ...(icon ? { icon } : {}),
});

function slide(layout: SlideLayout, blocks: Block[]): Slide {
  return { id: createId(), layout, blocks };
}

const B = {
  label: (s: string): Block => ({ id: createId(), kind: 'section-label', align: 'left', content: t(s) }),
  t1: (s: string): Block => ({ id: createId(), kind: 'title-1', align: 'left', content: t(s) }),
  /** Título com o SEGMENTO-CHAVE em destaque (a assinatura da referência). */
  t1Hl: (a: string, m: string): Block => ({ id: createId(), kind: 'title-1', align: 'left', content: [{ text: a }, { text: m, highlight: true }] }),
  t2: (s: string): Block => ({ id: createId(), kind: 'title-2', align: 'left', content: t(s) }),
  t2Hl: (a: string, m: string): Block => ({ id: createId(), kind: 'title-2', align: 'left', content: [{ text: a }, { text: m, highlight: true }] }),
  sub: (s: string): Block => ({ id: createId(), kind: 'subtitle', align: 'left', content: t(s) }),
  body: (s: string): Block => ({ id: createId(), kind: 'body', align: 'left', content: t(s) }),
  bodyHl: (a: string, m: string, z: string): Block => ({ id: createId(), kind: 'body', align: 'left', content: hl(a, m, z) }),
  high: (s: string): Block => ({ id: createId(), kind: 'highlight', align: 'left', content: t(s) }),
  cards: (...items: CardItem[]): Block => ({ id: createId(), kind: 'cards', align: 'left', items }),
  topics: (...items: string[]): Block => ({ id: createId(), kind: 'topics', align: 'left', items: items.map(t) }),
  stats: (...items: StatItem[]): Block => ({ id: createId(), kind: 'stats', align: 'left', items }),
  steps: (...items: string[]): Block => ({ id: createId(), kind: 'steps', align: 'left', items: items.map(t) }),
  compare: (a: CompareSide, b: CompareSide): Block => ({ id: createId(), kind: 'compare', align: 'left', sides: [a, b] }),
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
    B.t2Hl('O que o piloto ', 'mostrou.'),
    B.body('Seis semanas, dois times reais. O ganho veio da conferência, não da digitação.'),
    B.sub('Conduzido entre março e abril, com acompanhamento diário.'),
  ]);
  media.image = { src: photo, width: 1200, height: 900 };

  return [
    // CAPA (ref. p.1): kicker + título com segmento em destaque + subtítulo.
    slide('cover', [
      B.label('Apresentação de proposta'),
      B.t1Hl('Dor mapeada, diagnóstico ', 'estratégico.'),
      B.sub('Como o CITi transforma a operação da Sympla em margem.'),
    ]),

    // KPIs PÔSTER (ref. p.2): os números do CITi, gigantes, sem caixa.
    slide('content', [
      B.t2Hl('O CITi em ', 'números.'),
      B.stats(
        stat('30', 'anos de mercado'),
        stat('1ª', 'e maior EJ de tecnologia do Brasil'),
        stat('60', 'membros multidisciplinares'),
        stat('88', 'de NPS em 2025'),
      ),
    ]),

    // CARDS GRID (ref. p.5): número + ícone + título + filete + corpo, com apoio.
    slide('content', [
      B.label('Diagnóstico'),
      B.t2Hl('Três pontos que ', 'ficaram.'),
      B.sub('O ponto de partida que veio da última conversa, sem reinterpretar.'),
      B.cards(
        card('A dor está na qualidade do cadastro', 'Padronização e revisão manual crescendo com a base.', 'documento'),
        card('O time está esticado', 'A sobrecarga forçou a jornada de 8 para 10 horas.', 'usuarios'),
        card('O volume cresce com a migração', 'A origem do retrabalho aumenta a cada semana.', 'grafico'),
      ),
    ]),

    // COMPARAÇÃO (ref. p.6): ícone + rótulo verde + afirmação + sustentação.
    slide('content', [
      B.label('O problema real'),
      B.t2Hl('A dor real, ', 'em duas camadas.'),
      B.sub('A formulação inicial era a ponta visível. O problema tem camada mais profunda.'),
      B.compare(
        side('Dor declarada', 'documento', 'Padronização e qualidade de cadastros.', 'Revisão manual sobrando apesar da estrutura.'),
        side('Dor descoberta', 'dados', 'Conversão entre dois modelos de dados.', 'Volume cresce com o sucesso, contratar não resolve.'),
      ),
    ]),

    // STATEMENT central (ref. p.7): pergunta + traço + apoio.
    slide('content', [
      B.t2Hl('Por que o ', 'Discovery?'),
      B.body('Tecnologia em cima de processo que ninguém mapeou escala o erro, não o resultado.'),
      B.sub('Antes da tecnologia, a gente mergulha na operação e mapeia a raiz do problema.'),
    ]),

    // TIMELINE / cards de fase (ref. p.8).
    slide('content', [
      B.label('O plano'),
      B.t2Hl('Três fases. ', 'Seis semanas.'),
      B.steps('Diagnóstico operacional', 'Desenho da solução', 'Business case e plano'),
    ]),

    // CARDS de entrega (podem sair como FAIXAS, ref. p.9, conforme o arranjo).
    slide('content', [
      B.label('Entregas'),
      B.t2Hl('O que fica ', 'ao fim.'),
      B.sub('Cada fase fecha com material pronto pra mesa de decisão.'),
      B.cards(
        card('A dor quantificada em números reais', 'Sai do feeling e vira dado: tempo, reais, impacto.', 'busca'),
        card('A solução projetada pro problema', 'Arquitetura, protótipo funcional e dependências mapeadas.', 'cubo'),
        card('Business case com ROI projetado', 'Cronograma, riscos e retorno esperado.', 'grafico'),
      ),
    ]),

    // INDICADORES painel (ref. p.10 embaixo): card largo com divisores.
    slide('content', [
      B.label('Condições'),
      B.t2Hl('O formato da ', 'proposta.'),
      B.stats(
        stat('6 semanas', 'duração', 'calendario'),
        stat('3 etapas', 'fases', 'lista'),
        stat('Plano + case', 'entrega final', 'documento'),
      ),
    ]),

    // NÚMERO / investimento (ref. p.10): a pill de vidro.
    slide('content', [
      B.label('Discovery Enterprise'),
      B.t2Hl('Investi', 'mento.'),
      B.stats(stat('R$ 29.900', 'em três parcelas por entrega', 'cifrao')),
      B.sub('Condições válidas por 7 dias a partir desta apresentação.'),
    ]),

    // NÚMERO (LEGADO): dois títulos com métrica curta — decks antigos continuam de pé.
    slide('content', [
      B.label('Investimento'),
      B.t2('R$ 29.900'),
      B.t2('Projeto fechado, sem custo recorrente'),
      B.sub('Em três parcelas, atreladas às entregas de cada frente.'),
    ]),

    // CITAÇÃO: manchete + frase de impacto (arquétipo quote).
    slide('content', [
      B.label('A tese'),
      B.t2Hl('Processo antes de ', 'ferramenta.'),
      B.high('Quem automatiza a desordem só produz desordem mais rápido.'),
    ]),

    // TÓPICOS: a lista leve, maior.
    slide('content', [
      B.label('Como funciona'),
      B.t2Hl('O que muda ', 'na rotina.'),
      B.body('Sem treinamento novo: muda a ordem, não a ferramenta.'),
      B.topics(
        'O pedido chega já validado',
        'A conferência acontece durante, não depois',
        'O retrabalho vira exceção rastreada',
        'O gargalo aparece antes da fila',
      ),
    ]),

    media,

    slide('section', [B.label('Capítulo dois'), B.t1Hl('O que a operação ', 'ganha.')]),

    slide('closing', [
      B.t1Hl('Vamos ', 'começar?'),
      B.sub('Próximo passo: uma reunião de uma hora com o time.'),
      B.high('Aprovando esta semana, a validação entra antes do pico.'),
    ]),
  ];
}
