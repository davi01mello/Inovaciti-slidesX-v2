/**
 * Especificações ricas que alimentam o estrategista e a geradora:
 * OBJETIVO (o que a apresentação precisa alcançar), VOZ (o ritmo das frases e a
 * tendência na escolha dos formatos) e QUANTIDADE (como a narrativa se distribui).
 *
 * A densidade vive em writing.ts (DENSITY_RULE: teto por bloco, faixa por formato)
 * e a FORMA de cada slide vem do CATÁLOGO DE FORMATOS (writing.ts, FORMAT_CATALOG),
 * garantido pelo servidor em normalize.ts (enforceFormat). A voz NÃO dita estrutura:
 * ela inclina a escolha dos formatos e dá o ritmo das frases.
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
  /** Que formatos do catálogo este objetivo tipicamente pede, e onde. */
  formatosTipicos: string;
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
    formatosTipicos:
      'Uma proposta comercial TEM um slide de investimento: formato numero com o valor que o usuário deu (se ele deu valor). Prova com indicadores ou comparacao (com/sem, antes/depois). Pilares da proposta em cards. A jornada de trabalho em jornada. O fechamento pode ser citacao.',
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
    formatosTipicos:
      'A conclusão-chave entra cedo, em numero ou indicadores (com os dados REAIS que o usuário deu). Detalhamento em topicos e apoio. Comparacao para plano vs realizado. Sem dado numérico do usuário, a leitura é qualitativa: apoio e topicos.',
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
    formatosTipicos:
      'citacao e afirmacao carregam o arco emocional. A visão como caminho vira jornada. UM numero forte (se o usuário deu) vale mais que dez tópicos. Listas só quando indispensáveis, curtas.',
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
    formatosTipicos:
      'jornada para o método e o passo a passo. cards para conceitos que pedem definição. comparacao para o certo vs errado. topicos para checklists e recapitulações. citacao para o princípio que resume o módulo.',
    boasPraticas: 'Terminar seções com o ponto chave em uma frase. Repetição intencional é ferramenta didática, não redundância.',
    restricoes: 'Nunca dois conceitos novos disputando o mesmo slide. Jargão só se for ensinado antes.',
  },
};

/**
 * A VOZ É RITMO + TENDÊNCIA, NUNCA GRAMÁTICA.
 *
 * O erro da primeira era foi diferenciar as vozes por faixa de palavras (o modelo
 * ignora). O erro da segunda era foi transformar cada voz numa GRAMÁTICA DE BLOCOS
 * do deck inteiro: duas das três vozes ficaram quase-vazias por design, todo slide
 * do deck saiu com a mesma cara, e a densidade oscilou entre textão e slide oco.
 *
 * Agora a estrutura vem do CATÁLOGO DE FORMATOS (writing.ts), escolhido slide a
 * slide pelo conteúdo — e a voz faz o que voz faz: dá o ritmo das frases e inclina
 * a ESCOLHA dentro do catálogo. Toda voz tem acesso a todos os formatos.
 */
export interface StyleSpec {
  label: string;
  objetivo: string;
  /** Como esta voz INCLINA a escolha de formatos e a densidade dentro das faixas. */
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
      'A voz NÃO muda a gramática dos formatos: muda a ESCOLHA e o RITMO. Em Sereno, prefira os formatos leves (afirmacao, apoio, citacao) e, quando o conteúdo pedir lista, use o piso das contagens (3 tópicos, 2 cards, 2 stats). Densidade no PISO da faixa de cada formato. As regras de variedade valem igual: nem Sereno repete o mesmo formato em vizinhos.',
    ritmo:
      'Frases limpas e calmas, uma ideia por slide. O que não está na tela, a pessoa fala. Silêncio é elegância.',
    linguagem:
      'Econômica ao osso. Corte todo adjetivo e advérbio que não muda o sentido. O que sobra é o essencial, e o essencial é o que fica.',
    boasPraticas: 'Um assunto por slide. Se o assunto não cabe no formato, ele vira dois slides.',
    restricoes: 'Nunca parágrafo. Nunca dois formatos de apoio no mesmo slide.',
  },
  balanced: {
    label: 'Preciso',
    objetivo: 'O equilíbrio profissional: o leitor pega os pontos e sabe o que fazer com eles.',
    estrutura:
      'Catálogo inteiro à disposição, sem preferência: o formato de cada slide vem do conteúdo dele. Densidade no MEIO da faixa de cada formato.',
    ritmo: 'Frases diretas e estruturadas. Tópicos paralelos. Cards que afirmam e sustentam em uma linha só.',
    linguagem: 'Confiante e direta, sem gritar. Vocabulário técnico só quando é o termo certo.',
    boasPraticas: 'Cada slide sustenta UM assunto em poucos pontos.',
    restricoes: 'Sem paredes de texto. Um card nunca vira parágrafo.',
  },
  bold: {
    label: 'Presença',
    objetivo: 'Impacto e atitude. Uma frase que fica na cabeça depois que o slide passa.',
    estrutura:
      'Prefira os formatos de impacto (citacao, numero, afirmacao, comparacao). Listas só quando o conteúdo exige, e curtas. Densidade ABAIXO do meio da faixa de cada formato. As regras de variedade valem igual.',
    ritmo: 'Manchete: curta, presente do indicativo, verbo forte na frente. Uma ideia, um golpe.',
    linguagem: 'Assertiva. Título soa como manchete, nunca como rótulo de pasta. Sujeito, verbo, objeto.',
    boasPraticas: 'Alterne intensidade: um slide forte pede um vizinho mais calmo pra continuar forte.',
    restricoes: 'Impacto vem da IDEIA, não do volume. Nunca parágrafo.',
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
- Formatos típicos deste objetivo: ${spec.formatosTipicos}
- Boas práticas: ${spec.boasPraticas}
- Restrições: ${spec.restricoes}
`.trim();
}

/** Converte a spec de voz em texto de prompt. */
export function styleGuidance(style: VisualStyle): string {
  const spec = STYLES[style];
  return `
VOZ DA ESCRITA: ${spec.label}
A voz dá o RITMO das frases e INCLINA a escolha dos formatos dentro do catálogo. Ela nunca muda a gramática de um formato nem as regras de variedade.
- Intenção: ${spec.objetivo}
- Tendência de formatos e densidade: ${spec.estrutura}
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
Cada slide carrega UM assunto no formato certo pra ele. Se um assunto tem conteúdo demais pra faixa do formato, ele vira DOIS slides, nunca um slide lotado.
`.trim();
}

/** Linha de público pro prompt: o que o usuário declarou, ou a instrução de deduzir. */
export function audienceLine(audience: string): string {
  const trimmed = audience.trim();
  return trimmed.length > 0
    ? `PÚBLICO INFORMADO PELO USUÁRIO: "${trimmed}". Escreva para essas pessoas: o nível técnico, as referências e o que elas valorizam vêm daí.`
    : 'O usuário não descreveu o público. Deduza da ideia quem vai assistir e escreva pra essa plateia.';
}
