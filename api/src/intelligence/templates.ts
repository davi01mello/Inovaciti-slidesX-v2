/**
 * Especificações ricas que alimentam o estrategista e a geradora:
 * OBJETIVO (o que a apresentação precisa alcançar), VOZ (o ritmo das frases) e
 * QUANTIDADE (como a narrativa se distribui no espaço escolhido).
 *
 * A densidade geral vive em writing.ts (DENSITY_RULE): menos é mais, sempre. Cada VOZ
 * modula onde, dentro do enxuto, o deck cai (ver o campo `densidade` de cada StyleSpec).
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
 * A VOZ MUDA O RITMO E O QUANTO DE TEXTO.
 *
 * Todas as três vozes são enxutas (menos é mais, sempre — ver DENSITY_RULE em
 * writing.ts). O que a voz faz é escolher ONDE, dentro do enxuto, cada deck cai, e
 * COMO as frases soam:
 *
 *   Sereno    o mais silencioso: quase só títulos e tópicos soltos, muito respiro
 *   Preciso   o equilíbrio: tópicos estruturados, um card ou outro, ainda enxuto
 *   Presença  manchetes secas: afirmações de impacto, verbo forte na frente
 *
 * "Respiro" também é do DESENHO: o motor de zonas decide o espaço em branco medindo
 * a arte. Nenhuma voz é desculpa pra escrever parágrafo.
 */
export interface StyleSpec {
  label: string;
  objetivo: string;
  /** Quanto texto esta voz coloca na tela, dentro do enxuto geral. */
  densidade: string;
  /** Como as frases SOAM. */
  ritmo: string;
  linguagem: string;
  boasPraticas: string;
  restricoes: string;
}

export const STYLES: Record<VisualStyle, StyleSpec> = {
  minimal: {
    label: 'Sereno',
    objetivo: 'Leitura sem esforço. Cada ponto respira, e o olho pousa em um de cada vez.',
    densidade:
      'O MAIS ENXUTO dos três: 8 a 24 palavras por slide de conteúdo. Muitos slides são só um título com uma linha de síntese, ou um título e três tópicos de três palavras. Cards são raros aqui; body praticamente não existe.',
    ritmo:
      'Frases limpas e calmas, uma ideia por linha. Tópicos telegráficos. Silêncio é bem-vindo: o que não está na tela, a pessoa fala.',
    linguagem:
      'Econômica ao osso. Corte todo adjetivo e advérbio que não muda o sentido. O que sobra é o essencial, e o essencial é o que fica.',
    boasPraticas: 'Um assunto por slide, em pouquíssimos pontos limpos. Se está cheio, divida em dois slides.',
    restricoes: 'Nunca parágrafo, nunca card com duas linhas. Sereno é quase vazio de propósito, e isso é elegante.',
  },
  balanced: {
    label: 'Preciso',
    objetivo: 'O equilíbrio profissional: o leitor pega os pontos e sabe o que fazer com eles.',
    densidade:
      'O meio-termo: 15 a 38 palavras por slide de conteúdo. Tópicos estruturados são a base; um card ou outro quando o ponto pede apoio; afirmações secas de respiro. Ainda enxuto, nunca cheio.',
    ritmo:
      'Frases diretas e estruturadas. Tópicos paralelos. Cards que afirmam e sustentam em uma linha só. Body raro, e quando existe é UMA frase.',
    linguagem: 'Confiante e direta, sem gritar. Vocabulário técnico só quando é o termo certo.',
    boasPraticas: 'Cada slide sustenta UM assunto em poucos pontos. Quando existir um dado do usuário, ele vira o destaque.',
    restricoes: 'Sem paredes de texto. Um card nunca vira parágrafo. Prefira tópicos a cards.',
  },
  bold: {
    label: 'Presença',
    objetivo: 'Impacto e atitude. Frases que ficam na cabeça depois que o slide passa.',
    densidade:
      'Seco e forte: 8 a 26 palavras por slide de conteúdo. Muitos slides são uma AFIRMAÇÃO de manchete, quase só o título. Tópicos que soam como lemas. Card é exceção.',
    ritmo:
      'Frase de manchete: curta, presente do indicativo, verbo forte na frente. Tópicos que soam como lemas. Body raríssimo.',
    linguagem: 'Assertiva. Título soa como manchete, nunca como rótulo de pasta. Sujeito, verbo, objeto.',
    boasPraticas: 'Alterne intensidade: um slide forte pede um vizinho mais calmo pra continuar forte.',
    restricoes: 'Impacto vem da IDEIA, não do exagero nem do volume. Proibido superlativo vazio.',
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
A voz muda o RITMO das frases E o quanto de texto entra na tela. Todas as vozes são enxutas; esta define onde, dentro do enxuto, este deck cai.
- Intenção: ${spec.objetivo}
- Densidade desta voz: ${spec.densidade}
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
