import type { BlobVariant } from '@/components/ui/LiquidBlob';
import type { PresentationSize, VisualStyle } from '@/types/creation';

export type TemplateCategory = 'comercial' | 'institucional' | 'relatorios' | 'produto' | 'pessoas';

export const TEMPLATE_CATEGORY_LABEL: Record<TemplateCategory, string> = {
  comercial: 'Comercial',
  institucional: 'Institucional',
  relatorios: 'Relatórios',
  produto: 'Produto',
  pessoas: 'Pessoas',
};

/**
 * Um template é um ponto de partida real: ao usá-lo, o wizard abre com a ideia
 * pré-estruturada (ideaSkeleton), tamanho e estilo sugeridos — o usuário só
 * troca os colchetes pelo contexto dele.
 */
export interface PresentationTemplate {
  id: string;
  name: string;
  tag: string;
  category: TemplateCategory;
  description: string;
  blob: BlobVariant;
  size: PresentationSize;
  style: VisualStyle;
  ideaSkeleton: string;
}
