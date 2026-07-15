/**
 * Especificações ricas que alimentam o estrategista e a geradora:
 * OBJETIVO (o que a apresentação precisa alcançar), VOZ (o ritmo das frases) e
 * QUANTIDADE (como a narrativa se distribui no espaço escolhido).
 *
 * A densidade geral vive em writing.ts (DENSITY_RULE): menos é mais, sempre. Cada VOZ
 * define a FORMA do slide de conteúdo (ver o campo `estrutura` de cada StyleSpec), que o
 * servidor garante em normalize.ts (enforceVoice).
 *
 * Cada spec é um guia profissional completo. Enriquecer aqui melhora a geração
 * inteira sem tocar em mais nada.
 *
 * SYNC_WITH: app/src/data/creationOptions.ts (rótulos e descrições do wizard).
 * Se um card mudar de significado, estas specs precisam acompanhar.
 */
import type { PresentationGoal, VisualStyle } from '../types.js';

export interface GoalSpec {
  label: string;
  objetivo: string;
  sucesso: string;
  estrategiaNarrativa: string;
  tom: string;
  boasPraticas: string;
  restricoes: string;
}

export const GOALS: Record<PresentationGoal, GoalSpec> = {
  convince: {
    label: 'Convencer',
    objetivo: 'Conseguir um sim: fechar negócio, aprovar proposta, ganhar orçamento ou mandato.',
    sucesso: 'A plateia sai com uma decisão tomada ou um próximo passo aceito.',
    estrategiaNarrativa:
      'Tensão e resolução. O problema ou oportunidade entra cedo, com consequência real. A proposta só aparece quando o terreno está preparado. Os argumentos mais fortes vêm depois do diagnóstico, e as duas objeções mais prováveis são respondidas dentro da narrativa, antes de alguém levantá-las.',
    tom: 'Confiante e preparado, sem arrogância. Afirma, sustenta com o concreto, segue.',
    boasPraticas:
      'O fechamento pede algo específico: valor, prazo, recurso ou decisão. Uma apresentação de convencimento que termina só em agradecimento falhou.',
    restricoes: 'Nada de detalhe operacional profundo, isso é anexo ou conversa seguinte. Nada de promessa sem lastro.',
  },
  inform: {
    label: 'Informar',
    objetivo: 'Transmitir uma situação com clareza total: resultados, status, prestação de contas.',
    sucesso: 'A plateia entende o quadro completo em uma passada e sabe o que muda pra ela.',
    estrategiaNarrativa:
      'Sem suspense: a conclusão mais importante abre a apresentação, o detalhamento vem depois, em ordem de relevância. Cada seção responde uma pergunta que a plateia faria. O fechamento aponta prioridades e o que acontece a seguir.',
    tom: 'Sóbrio e transparente. Os fatos falam, inclusive os desconfortáveis.',
    boasPraticas:
      'Separar com honestidade o que foi bem do que não foi. Um relatório que só celebra perde credibilidade na segunda edição.',
    restricoes: 'Nada de floreio pra inflar resultado. Sem dado concreto do usuário, a leitura é qualitativa e diz isso.',
  },
  inspire: {
    label: 'Inspirar',
    objetivo: 'Mover a sala: visão de futuro, lançamento, discurso de virada, celebração.',
    sucesso: 'A plateia sai com vontade de fazer parte e uma frase na memória.',
    estrategiaNarrativa:
      'Arco emocional: o presente como ponto de partida, a visão como destino, o caminho como convite. Menos dados, mais significado. Frases curtas que ficam. O ritmo alterna momentos fortes com respiros, e o final é o ponto mais alto.',
    tom: 'Elevado sem ser piegas. Convicção genuína, zero autoajuda corporativa.',
    boasPraticas: 'Uma imagem central forte (uma ideia, um lema) que atravessa a apresentação e volta no fechamento.',
    restricoes: 'Proibido superlativo vazio. Inspiração vem de visão concreta, não de adjetivo empilhado.',
  },
  train: {
    label: 'Capacitar',
    objetivo: 'Ensinar de verdade: treinamento, workshop, onboarding, transferência de conhecimento.',
    sucesso: 'A plateia consegue aplicar o que viu, não apenas concordar com ele.',
    estrategiaNarrativa:
      'Didática progressiva: do panorama ao detalhe, do simples ao complexo. Cada conceito novo se apoia no anterior e ganha um exemplo concreto. Em apresentações longas, os capítulos funcionam como módulos, e o fechamento recapitula o essencial e aponta onde praticar.',
    tom: 'Próximo e claro, de quem já esteve do outro lado. Paciência sem condescendência.',
    boasPraticas: 'Terminar seções com o ponto chave em uma frase. Repetição intencional é ferramenta didática, não redundância.',
    restricoes: 'Nunca dois conceitos novos disputando o mesmo slide. Jargão só se for ensinado antes.',
  },
};

/**
 * A VOZ É UMA GRAMÁTICA DE BLOCOS, não uma faixa de palavras.
 *
 * O erro antigo era diferenciar as vozes por número de palavras (8-24 vs 15-38): o
 * modelo ignora, e todo slide saía com texto demais. Agora cada voz é uma FORMA de
 * slide distinta, e o servidor a garante (ver enforceVoice em normalize.ts):
 *
 *   Sereno   (minimal)  só título (+ subtítulo curto opcional). Nunca lista.
 *   Preciso  (balanced) a ÚNICA que enumera: título + UMA lista OU body curto.
 *   Presença (bold)     manchete: título + no máximo UM acento curto. Nunca lista.
 *
 * "Respiro" também é do DESENHO: o motor de zonas decide o espaço em branco medindo
 * a arte. Nenhuma voz é desculpa pra escrever parágrafo.
 */
export interface StyleSpec {
  label: string;
  objetivo: string;
  /** A GRAMÁTICA DE BLOCOS desta voz num slide de conteúdo. É o que o servidor GARANTE. */
  estrutura: string;
  /** Como as frases SOAM. */
  ritmo: string;
  linguagem: string;
  boasPraticas: string;
  restricoes: string;
}

export const STYLES: Record<VisualStyle, StyleSpec> = {
  minimal: {
    label: 'Sereno',
    objetivo: 'Leitura sem esforço. Cada slide respira, e o olho pousa numa ideia só.',
    estrutura:
      'A VOZ DO SILÊNCIO. Cada slide de CONTEÚDO é SÓ o título (title-2), ou o título mais UMA linha de síntese (subtitle, até 6 palavras). E acabou. NUNCA tópicos, NUNCA cards, NUNCA body/parágrafo, NUNCA destaque. A maioria dos slides é só um título forte. Teto de 12 palavras por slide, e o normal é 3 a 8. Sentiu vontade de listar? Resista: isso é a fala do apresentador, não a tela.',
    ritmo:
      'Frases limpas e calmas, uma ideia por slide. O que não está na tela, a pessoa fala. Silêncio é elegância.',
    linguagem:
      'Econômica ao osso. Corte todo adjetivo e advérbio que não muda o sentido. O que sobra é o essencial, e o essencial é o que fica.',
    boasPraticas: 'Um assunto por slide, num título limpo. Se o assunto não cabe num título, ele vira dois slides.',
    restricoes: 'Nunca lista, nunca card, nunca parágrafo, nunca destaque. Sereno é quase vazio de propósito.',
  },
  balanced: {
    label: 'Preciso',
    objetivo: 'O equilíbrio profissional: o leitor pega os pontos e sabe o que fazer com eles.',
    estrutura:
      'A ÚNICA VOZ QUE ENUMERA. Cada slide de CONTEÚDO é o título (title-2) mais UM formato de apoio, à escolha: OU 2 a 3 tópicos telegráficos (3 a 6 palavras cada), OU 2 cards curtíssimos (título de 2-3 palavras + uma linha de até 8), OU uma única frase de body (só quando não há lista). Um subtitle curto (até 6 palavras) é opcional. NUNCA duas listas, NUNCA lista e body juntos, NUNCA destaque. Teto de 26 palavras por slide, normal 12 a 22.',
    ritmo: 'Frases diretas e estruturadas. Tópicos paralelos. Cards que afirmam e sustentam em uma linha só.',
    linguagem: 'Confiante e direta, sem gritar. Vocabulário técnico só quando é o termo certo.',
    boasPraticas: 'Cada slide sustenta UM assunto em poucos pontos. Prefira tópicos a cards; body é o último recurso.',
    restricoes: 'Sem paredes de texto. Um card nunca vira parágrafo. Nunca dois formatos no mesmo slide.',
  },
  bold: {
    label: 'Presença',
    objetivo: 'Impacto e atitude. Uma frase que fica na cabeça depois que o slide passa.',
    estrutura:
      'A VOZ DA MANCHETE. Cada slide de CONTEÚDO é UMA afirmação seca (title-2), e no máximo UM acento de 1 a 3 palavras: um destaque (highlight) OU um rótulo (section-label), nunca os dois. NUNCA tópicos, NUNCA cards, NUNCA body, NUNCA subtitle. Muitos slides são só a manchete. Teto de 12 palavras por slide, normal 3 a 8. A força vem da brevidade e da ideia, jamais do volume.',
    ritmo: 'Manchete: curta, presente do indicativo, verbo forte na frente. Uma ideia, um golpe.',
    linguagem: 'Assertiva. Título soa como manchete, nunca como rótulo de pasta. Sujeito, verbo, objeto.',
    boasPraticas: 'Alterne intensidade: um slide forte pede um vizinho mais calmo pra continuar forte.',
    restricoes: 'Nunca lista, nunca card, nunca parágrafo. Impacto vem da IDEIA, não do volume.',
  },
};

/** Converte a spec de objetivo em texto de prompt. */
export function goalGuidance(goal: PresentationGoal): string {
  const spec = GOALS[goal];
  return `
OBJETIVO DA APRESENTAÇÃO: ${spec.label}
- O que precisa acontecer: ${spec.objetivo}
- Como é o sucesso: ${spec.sucesso}
- Estratégia narrativa recomendada: ${spec.estrategiaNarrativa}
- Tom: ${spec.tom}
- Boas práticas: ${spec.boasPraticas}
- Restrições: ${spec.restricoes}
`.trim();
}

/** Converte a spec de voz em texto de prompt. */
export function styleGuidance(style: VisualStyle): string {
  const spec = STYLES[style];
  return `
VOZ DA ESCRITA: ${spec.label}
A voz define a FORMA de cada slide de conteúdo (quais blocos existem) e o ritmo das frases. Siga a estrutura à risca: o servidor descarta o que fugir dela.
- Intenção: ${spec.objetivo}
- ESTRUTURA OBRIGATÓRIA desta voz (slides de conteúdo): ${spec.estrutura}
- Ritmo das frases: ${spec.ritmo}
- Linguagem: ${spec.linguagem}
- Boas práticas: ${spec.boasPraticas}
- Restrições: ${spec.restricoes}
`.trim();
}

/** Como a narrativa se distribui na quantidade escolhida. Faixas, não fórmulas. */
function countBand(slideCount: number): string {
  if (slideCount === 1) {
    return 'Um slide único funciona como cartaz: uma mensagem forte e autocontida, sem promessa de continuação.';
  }
  if (slideCount <= 4) {
    return 'Poucos slides: escolha MENOS assuntos. Cada slide que existir continua em pontos-chave escaneáveis. Corte assunto, não os pontos.';
  }
  if (slideCount <= 7) {
    return 'Espaço pra um argumento com começo, meio e fim. Um ponto por slide, desenvolvido até o fim, com transições limpas.';
  }
  if (slideCount <= 12) {
    return 'A faixa clássica: contexto, desenvolvimento, prova e fechamento respiram. Dá pra aprofundar o essencial sem pressa.';
  }
  if (slideCount <= 20) {
    return 'Narrativa em capítulos: agrupe o conteúdo em partes com separadores e mantenha a curva de interesse crescendo entre elas.';
  }
  return 'Jornada longa: cada capítulo precisa de função própria e clímax próprio. Planeje os separadores como respiros e recapitulações estratégicas.';
}

export function slideCountGuidance(slideCount: number): string {
  return `
QUANTIDADE DE SLIDES: exatamente ${slideCount}. Este número é uma decisão do usuário, não uma sugestão. A apresentação final tem ${slideCount} slides, nem mais, nem menos.
Como usar esse espaço: ${countBand(slideCount)}
Cada slide carrega UM assunto em pontos-chave escaneáveis. Se um assunto tem conteúdo demais pra um slide de pontos-chave, ele vira DOIS slides, nunca um slide lotado.
`.trim();
}

/** Linha de público pro prompt: o que o usuário declarou, ou a instrução de deduzir. */
export function audienceLine(audience: string): string {
  const trimmed = audience.trim();
  return trimmed.length > 0
    ? `PÚBLICO INFORMADO PELO USUÁRIO: "${trimmed}". Escreva para essas pessoas: o nível técnico, as referências e o que elas valorizam vêm daí.`
    : 'O usuário não descreveu o público. Deduza da ideia quem vai assistir e escreva pra essa plateia.';
}
