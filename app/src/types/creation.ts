export type PresentationSize = 'focused' | 'balanced' | 'complete';
export type VisualStyle = 'minimal' | 'balanced' | 'bold';

export interface DraftAsset {
  id: string;
  name: string;
  kind: 'image' | 'pdf' | 'logo' | 'other';
  sizeLabel: string;
}

export interface CreationDraft {
  idea: string;
  size: PresentationSize | null;
  style: VisualStyle | null;
  assets: DraftAsset[];
}

export const EMPTY_DRAFT: CreationDraft = {
  idea: '',
  size: null,
  style: null,
  assets: [],
};
