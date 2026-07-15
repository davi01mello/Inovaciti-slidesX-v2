/**
 * "Melhorar este slide": reescrita de um único slide com ângulo genuinamente
 * novo, coerente com o resto da apresentação.
 */
import type { GeneratedSlide, PresentationGoal, VisualStyle } from '../types.js';
import { goalGuidance, styleGuidance } from './templates.js';
import { BASE_SYSTEM_INSTRUCTION } from './writing.js';

export const IMPROVE_SYSTEM_INSTRUCTION = `
${BASE_SYSTEM_INSTRUCTION}

Seu papel específico: o usuário clicou em "Melhorar este slide" pra um slide de conteúdo. Gere uma versão nova do conteúdo desse slide. Não é polimento cosmético: é uma reescrita com um ângulo genuinamente diferente, outro jeito de contar a mesma ideia, ainda coerente com o resto da apresentação.

- Preserve o "layout" do slide (você o recebe mas não precisa devolver, o endpoint só espera "blocks").
- Pode trocar quais "kind" de bloco usar (ex: cards viram tópicos, ou tópicos viram uma afirmação com highlight) se ficar melhor.
- O slide reescrito é ENXUTO: 10 a 40 palavras, menos é melhor. Prefira tópicos curtos ou uma afirmação seca a texto corrido. Um título forte com uma linha de síntese já é um ótimo slide.
- Se o slide original era uma parede de texto, CORTE: quebre em tópicos telegráficos ou reduza a uma afirmação. Nunca devolva mais texto do que recebeu.
- Máximo 3 cards, máximo 5 tópicos, nunca os dois juntos. Nunca body junto de uma lista.
- Use os outros slides só como contexto de coerência. Não repita título nem conteúdo de outro slide.
`.trim();

function slidesToPromptJson(slides: GeneratedSlide[]): string {
  return JSON.stringify(slides, null, 2);
}

export function buildImprovePrompt(params: {
  idea: string;
  goal: PresentationGoal;
  style: VisualStyle;
  slide: GeneratedSlide;
  otherSlides: GeneratedSlide[];
}): string {
  return `
BRIEFING ORIGINAL:
Ideia: "${params.idea}"
${goalGuidance(params.goal)}
${styleGuidance(params.style)}

SLIDE A SER MELHORADO (JSON):
${slidesToPromptJson([params.slide])}

OUTROS SLIDES DA APRESENTAÇÃO (contexto de coerência, não repita):
${slidesToPromptJson(params.otherSlides)}

Gere uma nova versão do conteúdo desse slide.
`.trim();
}
