import type { PresentationSize, VisualStyle } from '@/types/creation';

export interface SizeOption {
  value: PresentationSize;
  label: string;
  hint: string;
  description: string;
  recommended?: boolean;
}

/**
 * Buckets by audience/context, not "how much stuff you want".
 * The AI picks the exact slide count inside each range.
 */
export const SIZE_OPTIONS: SizeOption[] = [
  {
    value: 'focused',
    label: 'Reunião rápida',
    hint: '4 a 6 slides',
    description: 'Aquela conversa direta com o time. Uma decisão, poucos pontos, sem enrolar.',
  },
  {
    value: 'balanced',
    label: 'Pitch ou diretoria',
    hint: '6 a 8 slides',
    description: 'Espaço pra defender uma ideia com contexto e próximos passos. Sem excessos.',
  },
  {
    value: 'complete',
    label: 'Cliente ou institucional',
    hint: '9 a 12 slides',
    description: 'A apresentação que precisa contar a história inteira. Contexto, valor e provas.',
  },
];

export interface StyleOption {
  value: VisualStyle;
  label: string;
  description: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    value: 'minimal',
    label: 'Sereno',
    description: 'Muito espaço em branco, tipografia grande, silêncio visual. Elegante e fácil de ler no telão.',
  },
  {
    value: 'balanced',
    label: 'Preciso',
    description: 'O equilíbrio certo pra maioria das ocasiões. Confiante sem gritar.',
  },
  {
    value: 'bold',
    label: 'Presença',
    description: 'Tipografia grande, contraste alto, atitude. Ideal quando você quer que ninguém desvie o olhar.',
  },
];
