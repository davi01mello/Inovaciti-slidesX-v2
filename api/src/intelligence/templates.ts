/**
 * Especificações ricas dos templates de geração: OCASIÃO (o momento em que a
 * apresentação vive) e ESTILO (a voz e a densidade visual do texto).
 *
 * Cada spec é um guia profissional completo. É daqui que o estrategista e a
 * geradora tiram orientação de público, narrativa, tom e restrições. Enriquecer
 * um template aqui melhora a geração inteira sem tocar em mais nada.
 *
 * SYNC_WITH: app/src/data/creationOptions.ts (rótulos dos cards do wizard).
 * Se o texto dos cards mudar de significado, estas specs precisam acompanhar.
 */
import type { PresentationSize, VisualStyle } from '../types.js';

export interface OccasionSpec {
  label: string;
  /** Faixa de slides quando o usuário deixa a quantidade no automático. */
  autoRange: { min: number; max: number };
  objetivo: string;
  quandoUsar: string;
  quandoNaoUsar: string;
  publico: string;
  estrategiaNarrativa: string;
  tom: string;
  boasPraticas: string;
  restricoes: string;
}

export const OCCASIONS: Record<PresentationSize, OccasionSpec> = {
  focused: {
    label: 'Reunião rápida',
    autoRange: { min: 4, max: 6 },
    objetivo: 'Alinhar um time e sair da sala com UMA decisão tomada ou um caminho claro.',
    quandoUsar: 'Conversa interna, decisão pontual, atualização de projeto, proposta de mudança de rota.',
    quandoNaoUsar: 'Quando o público ainda precisa ser convencido do problema. Contexto raso demais mata a decisão.',
    publico: 'Pessoas que já conhecem o contexto geral. Não perca slides explicando o que todos já sabem.',
    estrategiaNarrativa:
      'Direto ao ponto: situação em uma tela, a questão central, a recomendação com justificativa, o que acontece a seguir. A recomendação aparece cedo, o deck existe pra sustentá-la.',
    tom: 'Colega experiente falando com colegas. Zero cerimônia, zero enrolação, máxima clareza.',
    boasPraticas:
      'Uma decisão por apresentação. Se aparecerem duas decisões no briefing, escolha a principal e trate a outra como desdobramento.',
    restricoes: 'Sem slide de agenda, sem seção, sem contexto histórico longo. Cada slide ganha o direito de existir.',
  },
  balanced: {
    label: 'Pitch ou diretoria',
    autoRange: { min: 6, max: 8 },
    objetivo: 'Defender uma ideia diante de quem decide e conseguir um sim, um orçamento ou um mandato.',
    quandoUsar: 'Pitch interno, proposta pra diretoria, defesa de investimento, apresentação de plano.',
    quandoNaoUsar: 'Relatório de acompanhamento sem pedido no final. Sem "ask", esse formato perde a força.',
    publico:
      'Decisores com pouco tempo e visão ampla. Eles julgam clareza de raciocínio antes de julgar a ideia. Antecipe as duas objeções mais prováveis e responda dentro da narrativa.',
    estrategiaNarrativa:
      'Tensão e resolução: contexto que importa, o problema ou oportunidade com consequência real, a proposta, por que ela funciona, o que se ganha, o pedido explícito. O argumento mais forte entra depois do problema estar estabelecido, nunca antes.',
    tom: 'Confiante e preparado, sem arrogância. Frases afirmativas, dados quando existirem, zero hedge desnecessário.',
    boasPraticas:
      'O pedido final é concreto: valor, prazo, recurso ou decisão. Um pitch que termina em "obrigado" sem pedido falhou.',
    restricoes: 'Nada de detalhe operacional profundo. Detalhe é anexo ou reunião seguinte, não slide.',
  },
  complete: {
    label: 'Cliente ou institucional',
    autoRange: { min: 9, max: 12 },
    objetivo: 'Contar a história inteira pra alguém de fora: contexto, valor, prova e caminho, construindo confiança.',
    quandoUsar: 'Proposta comercial, apresentação institucional, relatório de resultados pra cliente, kickoff.',
    quandoNaoUsar: 'Público interno que já conhece a empresa. Repetir a história institucional pra quem vive nela desperdiça atenção.',
    publico:
      'Pessoas de fora do contexto, possivelmente comparando com alternativas. Elas precisam entender rápido quem somos, o que está sendo proposto e por que confiar.',
    estrategiaNarrativa:
      'Jornada completa: quem somos em uma tela, o diagnóstico da situação do cliente, a proposta, como funciona na prática, prova ou casos, investimento ou resultado, próximos passos. O cliente é o protagonista da história, a CITi é o guia.',
    tom: 'Profissional e próximo. Institucional não significa frio: escreva pra pessoa que lê, não pra empresa abstrata.',
    boasPraticas:
      'Traduza toda capacidade técnica em benefício pro cliente. Ninguém compra stack, compram o que ela resolve.',
    restricoes: 'Sem autoelogios vazios ("empresa líder", "excelência"). Prova concreta ou nada.',
  },
};

export interface StyleSpec {
  label: string;
  objetivo: string;
  quandoUsar: string;
  quandoNaoUsar: string;
  densidade: string;
  linguagem: string;
  boasPraticas: string;
  restricoes: string;
}

export const STYLES: Record<VisualStyle, StyleSpec> = {
  minimal: {
    label: 'Sereno',
    objetivo: 'Silêncio visual e leitura sem esforço. O slide respira e cada palavra carrega mais peso.',
    quandoUsar: 'Telão, plateia grande, temas sensíveis, mensagens que precisam de gravidade.',
    quandoNaoUsar: 'Conteúdo denso em dados ou processo com muitas etapas. Esse estilo pede pouco texto por tela.',
    densidade:
      'Pouquíssimo texto por slide: frases curtas, no máximo 2 ou 3 bullets quando bullets existirem. Prefira afirmações centrais vivendo sozinhas na tela.',
    linguagem: 'Econômica e precisa. Corte todo advérbio que não muda o sentido. O espaço em branco faz parte da mensagem.',
    boasPraticas: 'Se um slide ficou cheio, divida em dois. Nesse estilo, densidade é defeito, nunca aproveitamento.',
    restricoes: 'Nunca mais de um bloco de bullets por slide. Nunca parágrafos.',
  },
  balanced: {
    label: 'Preciso',
    objetivo: 'O equilíbrio profissional padrão: informação suficiente pra sustentar o argumento, sem sobrecarregar.',
    quandoUsar: 'A maioria das ocasiões: reuniões, propostas, relatórios. É o estilo seguro quando há dúvida.',
    quandoNaoUsar: 'Quando a ocasião pede drama (lançamento, keynote) ou contemplação (visão, manifesto).',
    densidade: 'De 3 a 4 bullets por slide quando fizer sentido, títulos informativos, um apoio curto onde ajudar.',
    linguagem: 'Confiante e direta, sem gritar. Afirma, justifica, segue em frente.',
    boasPraticas: 'Cada slide sustenta UMA ideia com no máximo dois níveis de informação: a tese e o apoio.',
    restricoes: 'Sem paredes de texto. Se precisar de mais de 4 bullets, o conteúdo pede dois slides ou uma lista numerada.',
  },
  bold: {
    label: 'Presença',
    objetivo: 'Impacto e atitude. A apresentação que ninguém consegue ignorar, com frases que ficam na memória.',
    quandoUsar: 'Pitch competitivo, lançamento, momento de virada, quando a energia da sala importa tanto quanto o conteúdo.',
    quandoNaoUsar: 'Relatórios sóbrios, temas delicados, públicos conservadores. Atitude fora de hora vira ruído.',
    densidade: 'Frases de impacto curtas e diretas. Pode usar até 4 ou 5 bullets quando o conteúdo pedir, mas afirmações fortes dominam.',
    linguagem: 'Assertiva, verbos fortes, presente do indicativo. Cada título soa como manchete, nunca como rótulo.',
    boasPraticas: 'Alterne intensidade: um slide forte precisa de um vizinho mais calmo pra continuar forte.',
    restricoes: 'Impacto vem da ideia, não de exagero. Proibido superlativo vazio e promessa sem lastro.',
  },
};

/** Converte a spec de ocasião em texto de prompt. */
export function occasionGuidance(size: PresentationSize): string {
  const spec = OCCASIONS[size];
  return `
OCASIÃO DA APRESENTAÇÃO: ${spec.label}
- Objetivo do formato: ${spec.objetivo}
- Público típico: ${spec.publico}
- Estratégia narrativa recomendada: ${spec.estrategiaNarrativa}
- Tom: ${spec.tom}
- Boas práticas: ${spec.boasPraticas}
- Restrições: ${spec.restricoes}
`.trim();
}

/** Converte a spec de estilo em texto de prompt. */
export function styleGuidance(style: VisualStyle): string {
  const spec = STYLES[style];
  return `
ESTILO DE ESCRITA: ${spec.label}
- Intenção: ${spec.objetivo}
- Densidade por slide: ${spec.densidade}
- Linguagem: ${spec.linguagem}
- Boas práticas: ${spec.boasPraticas}
- Restrições: ${spec.restricoes}
`.trim();
}

/** Regra de quantidade: exata quando o usuário escolheu, faixa da ocasião no automático. */
export function slideCountRule(size: PresentationSize, slideCount: number | null): string {
  if (slideCount !== null) {
    return `QUANTIDADE DE SLIDES: exatamente ${slideCount}. Este número é uma decisão do usuário, não uma sugestão. A apresentação final tem ${slideCount} slides, nem mais, nem menos.`;
  }
  const range = OCCASIONS[size].autoRange;
  return `QUANTIDADE DE SLIDES: escolha a quantidade ideal entre ${range.min} e ${range.max} slides, conforme a densidade real do conteúdo. Nunca estique conteúdo pra preencher, nunca esprema conteúdo pra caber.`;
}
