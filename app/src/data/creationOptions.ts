/**
 * As escolhas do wizard, com o texto que o usuário lê.
 * SYNC_WITH: api/src/intelligence/templates.ts (as specs ricas que a IA recebe
 * pra cada uma dessas opções). Se um rótulo mudar de significado aqui, a spec
 * correspondente precisa acompanhar.
 */
import type { PresentationGoal, VisualStyle } from '@/types/creation';
import type { IconName } from '@/components/ui/Icon';

export interface GoalOption {
  value: PresentationGoal;
  icon: IconName;
  label: string;
  /** Uma linha: o que precisa acontecer quando o último slide fechar. */
  outcome: string;
  description: string;
}

/**
 * O objetivo é a pergunta mais importante do fluxo: é dele que nasce a narrativa.
 * Uma mesma ideia vira decks completamente diferentes se o fim for convencer ou
 * capacitar.
 */
export const GOAL_OPTIONS: GoalOption[] = [
  {
    value: 'convince',
    icon: 'sparkle-design',
    label: 'Convencer',
    outcome: 'A sala decide sim.',
    description: 'Proposta, pitch, defesa de orçamento. A narrativa constrói tensão e fecha pedindo algo concreto.',
  },
  {
    value: 'inform',
    icon: 'structure',
    label: 'Informar',
    outcome: 'A sala entende o quadro.',
    description: 'Relatório, status, prestação de contas. A conclusão abre a apresentação, o detalhe vem depois.',
  },
  {
    value: 'inspire',
    icon: 'idea',
    label: 'Inspirar',
    outcome: 'A sala quer fazer parte.',
    description: 'Visão, lançamento, celebração. Menos dado, mais significado, com um final no ponto mais alto.',
  },
  {
    value: 'train',
    icon: 'compass',
    label: 'Capacitar',
    outcome: 'A sala consegue aplicar.',
    description: 'Treinamento, workshop, onboarding. Do simples ao complexo, com exemplo a cada conceito novo.',
  },
];

export interface StyleOption {
  value: VisualStyle;
  label: string;
  description: string;
}

/** A voz muda a QUANTIDADE e a forma do texto: cada uma gera um tipo de slide diferente. */
export const STYLE_OPTIONS: StyleOption[] = [
  {
    value: 'minimal',
    label: 'Sereno',
    description: 'Quase só o título. O mínimo de texto na tela.',
  },
  {
    value: 'balanced',
    label: 'Preciso',
    description: 'Título e poucos tópicos. O único que faz listas.',
  },
  {
    value: 'bold',
    label: 'Presença',
    description: 'Manchetes secas. Uma ideia de impacto por slide.',
  },
];

/** Exemplos que ensinam o formato do campo de público sem obrigar a preencher.
 * Públicos reais das apresentações da CITi, em Caixa Alta Inicial. */
export const AUDIENCE_EXAMPLES: string[] = [
  'Diretoria Executiva',
  'Time Técnico Do Cliente',
  'Novos Membros Da CITi',
  'Cliente Corporativo',
];
