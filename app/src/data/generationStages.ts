export interface GenerationStage {
  id: string;
  label: string;
  detail: string;
  duration: number;
}

export const GENERATION_STAGES: GenerationStage[] = [
  { id: 'strategy', label: 'Planejando a estratégia', detail: 'Objetivo, público e o papel de cada slide.', duration: 1000 },
  { id: 'hierarchy', label: 'Lendo a narrativa', detail: 'Ajustando o que vem antes, o que vem depois.', duration: 900 },
  { id: 'refining', label: 'Refinando as palavras', detail: 'Tirando peso, deixando cada slide direto.', duration: 1100 },
  { id: 'layouts', label: 'Escolhendo os layouts', detail: 'O jeito que cada slide vai respirar.', duration: 1000 },
  { id: 'identity', label: 'Vestindo a identidade CITi', detail: 'Cor, tipografia, ritmo.', duration: 900 },
  { id: 'render', label: 'Renderizando', detail: 'Última passada antes de te entregar.', duration: 900 },
];
