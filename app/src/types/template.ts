import type { BlobVariant } from '@/components/ui/LiquidBlob';
import type { PresentationGoal, VisualStyle } from '@/types/creation';

export type TemplateCategory = 'comercial' | 'institucional' | 'relatorios' | 'produto' | 'pessoas';

export const TEMPLATE_CATEGORY_LABEL: Record<TemplateCategory, string> = {
  comercial: 'Comercial',
  institucional: 'Institucional',
  relatorios: 'Relatórios',
  produto: 'Produto',
  pessoas: 'Pessoas',
};

/**
 * Um template é um ponto de partida real: ao usá-lo, o wizard abre com o
 * briefing já estruturado (ideaSkeleton), mais o objetivo, a extensão e o tom
 * sugeridos. O usuário só troca os colchetes pelo contexto dele.
 *
 * O ideaSkeleton é a peça mais valiosa daqui, porque é o que a IA de fato lê.
 * Um esqueleto de duas linhas produz uma apresentação rasa, então cada um
 * carrega a estrutura narrativa inteira daquele tipo de deck.
 */
export interface PresentationTemplate {
  id: string;
  name: string;
  tag: string;
  category: TemplateCategory;
  description: string;
  blob: BlobVariant;
  goal: PresentationGoal;
  slideCount: number;
  style: VisualStyle;
  ideaSkeleton: string;
}
