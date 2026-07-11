/**
 * Roteiro do guia rápido: seis cenas, cada uma com o texto do lado esquerdo e a
 * demo viva que roda no palco à direita. A ordem espelha o fluxo real do app,
 * do briefing ao modo de apresentação — a mesma história do "Como Funciona" do
 * Hero, agora acontecendo na frente do usuário.
 */
import type { ComponentType } from 'react';
import { WelcomeDemo } from '@/components/onboarding/demos/WelcomeDemo';
import { BriefingDemo } from '@/components/onboarding/demos/BriefingDemo';
import { StructureDemo } from '@/components/onboarding/demos/StructureDemo';
import { EditorDemo } from '@/components/onboarding/demos/EditorDemo';
import { GenerationDemo } from '@/components/onboarding/demos/GenerationDemo';
import { PresentDemo } from '@/components/onboarding/demos/PresentDemo';

export interface TourStep {
  id: string;
  /** Rótulo pequeno acima do título, situa o usuário no fluxo. */
  kicker: string;
  /** Parte neutra do título, em branco. */
  title: string;
  /** Palavra final do título, com o gradiente verde da marca. */
  accent: string;
  /** Parágrafo de apoio, curto e humano. */
  description: string;
  /** Cena animada que roda no palco. */
  demo: ComponentType;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    kicker: 'Guia rápido',
    title: 'Bem-vindo ao',
    accent: 'CITi Slides',
    description:
      'Este é o gerador de apresentações do CITi. Nos próximos passos você vê o caminho inteiro, de uma ideia solta até o deck pronto pra subir no palco.',
    demo: WelcomeDemo,
  },
  {
    id: 'briefing',
    kicker: 'Passo 1 · Briefing',
    title: 'Tudo começa com uma',
    accent: 'ideia',
    description:
      'Escreva o briefing do seu jeito, como quem explica pra um amigo. Você escolhe o tamanho e o estilo, e isso já basta pra IA entender onde quer chegar.',
    demo: BriefingDemo,
  },
  {
    id: 'structure',
    kicker: 'Passo 2 · Estrutura',
    title: 'A IA monta a',
    accent: 'estrutura',
    description:
      'Em segundos aparece a espinha do deck, slide por slide. Reordene, renomeie ou corte o que não servir, o controle é sempre seu.',
    demo: StructureDemo,
  },
  {
    id: 'editor',
    kicker: 'Passo 3 · Edição',
    title: 'Refine cada',
    accent: 'detalhe',
    description:
      'Cada slide vira um card editável. Clique num bloco, troque o texto e veja tudo mudar na hora. Pode experimentar no palco aqui do lado.',
    demo: EditorDemo,
  },
  {
    id: 'generation',
    kicker: 'Passo 4 · Geração',
    title: 'Design com a marca',
    accent: 'CITi',
    description:
      'A geração veste cada slide com a identidade da casa, verde como acento, espaço de sobra e tipografia forte. Fica com cara de trabalho de designer.',
    demo: GenerationDemo,
  },
  {
    id: 'present',
    kicker: 'Passo 5 · Palco',
    title: 'Pronto pra',
    accent: 'apresentar',
    description:
      'Apresente direto do navegador ou exporte em PPTX pra levar onde quiser. Sua primeira apresentação está a um clique daqui.',
    demo: PresentDemo,
  },
];
