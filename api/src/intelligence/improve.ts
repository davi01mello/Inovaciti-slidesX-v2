/**
 * "Melhorar este slide": reescrita de um único slide com ângulo genuinamente
 * novo, coerente com o resto da apresentação.
 */
import type { GeneratedSlide, PresentationGoal, VisualStyle } from '../types.js';
import { currentYearLine } from './knowledge.js';
import { goalGuidance, styleGuidance } from './templates.js';
import { BASE_SYSTEM_INSTRUCTION } from './writing.js';

export const IMPROVE_SYSTEM_INSTRUCTION = `
${BASE_SYSTEM_INSTRUCTION}

Seu papel específico: reescrever o conteúdo de UM slide de conteúdo. Duas origens possíveis, que mudam o que "melhorar" significa aqui:
- O usuário clicou em "Melhorar este slide" (sem instrução específica): gere uma versão nova com um ângulo genuinamente diferente, outro jeito de contar a mesma ideia, ainda coerente com o resto da apresentação. Não é polimento cosmético.
- O usuário pediu uma mudança específica pelo chat (instrução presente no prompt): aplique EXATAMENTE essa instrução. Não é ângulo novo por ângulo novo — é a mudança pedida, e só ela. Preserve o que a instrução não mencionou.

- Preserve o "layout" do slide (você o recebe mas não precisa devolver, o endpoint só espera "blocks").
- O slide reescrito é UM formato do CATÁLOGO DE FORMATOS, com a gramática e a faixa dele. TROCAR o formato é bem-vindo (o usuário pediu uma versão diferente): topicos podem virar jornada, apoio pode virar citacao, cards podem virar comparacao, um número real pode virar stats.
- Nenhum bloco passa de 25 palavras. Se o slide original era uma parede de texto, CORTE: quebre no formato certo ou reduza. Nunca devolva mais texto do que recebeu.
- Não repita o formato dos slides vizinhos (você os vê no contexto): o deck inteiro deve parecer desenhado à mão, cada slide com uma forma própria.
- stats só com números que já existem no slide ou no briefing. Nunca invente.
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
  /** Instrução específica do usuário (veio do chat). Ausente = pedido genérico de "ângulo novo". */
  instruction?: string;
}): string {
  const request = params.instruction
    ? `INSTRUÇÃO ESPECÍFICA DO USUÁRIO PRA ESTE SLIDE (aplique exatamente isto, preserve o resto):\n"""\n${params.instruction}\n"""\n\nAplique a instrução acima.`
    : 'Gere uma nova versão do conteúdo desse slide, com um ângulo genuinamente diferente.';

  return `
${currentYearLine()}

BRIEFING ORIGINAL:
Ideia: "${params.idea}"
${goalGuidance(params.goal)}
${styleGuidance(params.style)}

SLIDE A SER MELHORADO (JSON):
${slidesToPromptJson([params.slide])}

OUTROS SLIDES DA APRESENTAÇÃO (contexto de coerência, não repita):
${slidesToPromptJson(params.otherSlides)}

${request}
`.trim();
}
