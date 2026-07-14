/**
 * Especificações ricas que alimentam o estrategista e a geradora:
 * OBJETIVO (o que a apresentação precisa alcançar), VOZ (o ritmo das frases) e
 * QUANTIDADE (como a narrativa se distribui no espaço escolhido).
 *
 * A densidade do texto NÃO é uma spec: ela é fixa e vive em writing.ts (DENSITY_RULE).
 * Todo slide de conteúdo tem de 60 a 140 palavras, em qualquer voz, com qualquer objetivo.
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
 * A VOZ É RITMO, NÃO QUANTIDADE.
 *
 * ARMADILHA REAL, e ela custou caro: na versão anterior a voz "Sereno" mandava,
 * com todas as letras, escrever "pouquíssimo texto por slide" e dizia que
 * "densidade é defeito". Um terço dos decks do sistema nascia raso por DESIGN, e
 * o gerador estava obedecendo direitinho. O defeito não era do modelo: era do
 * prompt.
 *
 * As três vozes agora são DENSAS. Todas as três entregam 60 a 140 palavras por
 * slide de conteúdo. O que muda entre elas é COMO as frases soam:
 *
 *   Sereno    prosa fluida, frases longas e respiradas
 *   Preciso   prosa estruturada, afirma / justifica / conclui
 *   Presença  prosa de manchete, frases curtas e verbos fortes
 *
 * "Respiro" virou uma propriedade do DESENHO (o motor de zonas decide quanto
 * espaço em branco o slide tem, medindo a arte), não uma desculpa pra escrever
 * menos. Espaço em branco é trabalho do designer. Texto é trabalho do escritor.
 */
export interface StyleSpec {
  label: string;
  objetivo: string;
  /** Como as frases SOAM. Nunca "quanto texto" — isso é fixo em 60 a 140 palavras. */
  ritmo: string;
  linguagem: string;
  boasPraticas: string;
  restricoes: string;
}

export const STYLES: Record<VisualStyle, StyleSpec> = {
  minimal: {
    label: 'Sereno',
    objetivo:
      'Leitura sem esforço. O texto flui como um bom parágrafo de ensaio: o leitor chega ao fim sem perceber que leu.',
    ritmo:
      'Prosa fluida. Frases mais longas e respiradas, ligadas por conectivos naturais, sem staccato. Um parágrafo de body soa como um trecho de texto bem escrito, não como uma lista disfarçada. Densidade normal do sistema: de 60 a 140 palavras por slide de conteúdo, sempre.',
    linguagem:
      'Econômica no adjetivo, generosa no argumento. Corte todo advérbio que não muda o sentido, mas nunca corte a explicação: é ela que faz o slide valer a pena.',
    boasPraticas:
      'Prefira desenvolver UMA ideia por slide até o fim a espalhar três pela metade. Um slide sereno é aquele em que a única ideia foi explicada inteira.',
    restricoes:
      'Sereno NÃO significa curto. Um slide com título e três palavras não é sereno, é vazio. Se o slide ficou raso, o problema não é o tom: é a falta de conteúdo.',
  },
  balanced: {
    label: 'Preciso',
    objetivo:
      'O equilíbrio profissional: o leitor entende a tese, vê a sustentação e sabe o que fazer com aquilo.',
    ritmo:
      'Prosa estruturada, em três tempos: afirma, justifica, conclui. Frases de comprimento médio e regular. O body abre com a tese em uma frase, sustenta com uma ou duas, e fecha com a consequência prática.',
    linguagem:
      'Confiante e direta, sem gritar. Vocabulário técnico só quando ele é o termo certo, nunca como enfeite.',
    boasPraticas:
      'Cada slide sustenta UMA ideia em dois níveis: a tese e a prova. Quando existir um dado do usuário, é ele que sustenta.',
    restricoes:
      'Sem paredes de texto sem respiro interno, mas também sem slide de uma linha. O teto de 140 palavras existe; o piso de 60 também.',
  },
  bold: {
    label: 'Presença',
    objetivo: 'Impacto e atitude. Frases que ficam na cabeça depois que o slide passa.',
    ritmo:
      'Prosa de manchete. Frases curtas, cortadas, no presente do indicativo. Verbo forte na frente. O body é uma sequência de golpes curtos que constroem o argumento, não um parágrafo macio. Mesmo assim ele TEM parágrafo: 2 a 4 frases completas, de 60 a 140 palavras no slide.',
    linguagem:
      'Assertiva. Título soa como manchete de jornal, nunca como rótulo de pasta. Sujeito, verbo, objeto.',
    boasPraticas:
      'Alterne intensidade: um slide forte precisa de um vizinho mais calmo pra continuar forte. Frase curta só impacta perto de uma frase longa.',
    restricoes:
      'Impacto vem da IDEIA, não do exagero. Proibido superlativo vazio e promessa sem lastro. Frase curta não é desculpa pra slide raso: são frases curtas, várias delas.',
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

/** Converte a spec de tom em texto de prompt. */
export function styleGuidance(style: VisualStyle): string {
  const spec = STYLES[style];
  return `
VOZ DA ESCRITA: ${spec.label}
A voz muda o RITMO das frases. Ela NÃO muda a quantidade de texto: todo slide de conteúdo tem de 60 a 140 palavras, nas três vozes.
- Intenção: ${spec.objetivo}
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
    return 'Poucos slides: escolha MENOS assuntos, não menos texto. Cada slide que existir continua denso (60 a 140 palavras). Corte assunto, nunca profundidade.';
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
Distribua a profundidade com equilíbrio: nunca estique conteúdo pra preencher, nunca esprema dois assuntos num slide só.
`.trim();
}

/** Linha de público pro prompt: o que o usuário declarou, ou a instrução de deduzir. */
export function audienceLine(audience: string): string {
  const trimmed = audience.trim();
  return trimmed.length > 0
    ? `PÚBLICO INFORMADO PELO USUÁRIO: "${trimmed}". Escreva para essas pessoas: o nível técnico, as referências e o que elas valorizam vêm daí.`
    : 'O usuário não descreveu o público. Deduza da ideia quem vai assistir e escreva pra essa plateia.';
}
