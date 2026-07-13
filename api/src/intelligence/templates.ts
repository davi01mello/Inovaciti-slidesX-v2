/**
 * Especificações ricas que alimentam o estrategista e a geradora:
 * OBJETIVO (o que a apresentação precisa alcançar), TOM (a voz e a densidade do
 * texto) e QUANTIDADE (como a narrativa se distribui no espaço escolhido).
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

export interface StyleSpec {
  label: string;
  objetivo: string;
  densidade: string;
  linguagem: string;
  boasPraticas: string;
  restricoes: string;
}

export const STYLES: Record<VisualStyle, StyleSpec> = {
  minimal: {
    label: 'Sereno',
    objetivo: 'Silêncio visual e leitura sem esforço. O slide respira e cada palavra carrega mais peso.',
    densidade:
      'Pouquíssimo texto por slide: frases curtas, no máximo 2 ou 3 bullets quando bullets existirem. Prefira afirmações centrais vivendo sozinhas na tela.',
    linguagem: 'Econômica e precisa. Corte todo advérbio que não muda o sentido. O espaço em branco faz parte da mensagem.',
    boasPraticas: 'Se um slide ficou cheio, divida em dois. Nesse tom, densidade é defeito.',
    restricoes: 'Nunca mais de um bloco de bullets por slide. Nunca parágrafos.',
  },
  balanced: {
    label: 'Preciso',
    objetivo: 'O equilíbrio profissional padrão: informação suficiente pra sustentar o argumento, sem sobrecarregar.',
    densidade: 'De 3 a 4 bullets por slide quando fizer sentido, títulos informativos, um apoio curto onde ajudar.',
    linguagem: 'Confiante e direta, sem gritar. Afirma, justifica, segue em frente.',
    boasPraticas: 'Cada slide sustenta UMA ideia com no máximo dois níveis: a tese e o apoio.',
    restricoes: 'Sem paredes de texto. Mais de 4 bullets pede dois slides ou uma lista numerada.',
  },
  bold: {
    label: 'Presença',
    objetivo: 'Impacto e atitude. A apresentação que ninguém consegue ignorar, com frases que ficam.',
    densidade: 'Frases de impacto curtas dominam. Até 4 ou 5 bullets quando o conteúdo pedir de verdade.',
    linguagem: 'Assertiva, verbos fortes, presente do indicativo. Título soa como manchete, nunca como rótulo.',
    boasPraticas: 'Alterne intensidade: um slide forte precisa de um vizinho mais calmo pra continuar forte.',
    restricoes: 'Impacto vem da ideia, não de exagero. Proibido superlativo vazio e promessa sem lastro.',
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
TOM DA ESCRITA: ${spec.label}
- Intenção: ${spec.objetivo}
- Densidade por slide: ${spec.densidade}
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
    return 'Pouquíssimo espaço: só a mensagem central, uma sustentação e o próximo passo. Corte sem dó tudo que for complementar.';
  }
  if (slideCount <= 7) {
    return 'Espaço pra um argumento com começo, meio e fim, sem gordura. Um ponto por slide, transições limpas.';
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
