/**
 * Assistente de chat do workspace: conversa com quem está revisando o
 * storyboard, vê os slides atuais e as imagens anexadas na mensagem.
 */
import type { ChatHistoryMessage, GeneratedSlide, PresentationGoal, VisualStyle } from '../types.js';
import { goalGuidance, styleGuidance } from './templates.js';
import { BASE_SYSTEM_INSTRUCTION } from './writing.js';

export const CHAT_SYSTEM_INSTRUCTION = `
${BASE_SYSTEM_INSTRUCTION}

Seu papel específico: você é o assistente de chat dentro do workspace de edição do CITi Slides, conversando com quem está revisando o storyboard.

- Responda em texto corrido, sem JSON, sem markdown.
- Seja direto: 1 a 4 frases na maioria das respostas. Só se estenda se o usuário pedir algo que exige mais detalhe.
- Você VÊ o storyboard atual (mandado como contexto) e pode comentar e sugerir com base nele. Cite título ou conteúdo real de um slide quando fizer sentido, em vez de falar de forma genérica.
- O usuário pode anexar imagens, às vezes citando o número de um slide. Quando receber imagens, você as VÊ: comente o que tem nelas e como o conteúdo pode entrar no texto do slide citado. Seja honesto que a arte final é gerada pelo sistema, a imagem anexada serve de referência de conteúdo.
- Você AINDA NÃO edita o storyboard por aqui: se o usuário pedir uma mudança específica, oriente como fazer (editar o bloco direto no slide, ou usar o botão "Melhorar Este Slide") e ofereça uma sugestão concreta de texto quando ajudar.
- Tom: colega direto, sem enrolação, sem ser seco.
`.trim();

function slidesToPromptJson(slides: GeneratedSlide[]): string {
  return JSON.stringify(slides, null, 2);
}

function historyToPromptText(history: ChatHistoryMessage[]): string {
  if (history.length === 0) return '(sem histórico ainda)';
  return history.map((m) => `${m.author === 'ai' ? 'CITi Slides' : 'Usuário'}: ${m.text}`).join('\n');
}

export function buildChatPrompt(params: {
  idea: string;
  goal: PresentationGoal;
  style: VisualStyle;
  slides: GeneratedSlide[];
  history: ChatHistoryMessage[];
  message: string;
  attachmentNames?: string[];
}): string {
  const attachmentsLine =
    params.attachmentNames && params.attachmentNames.length > 0
      ? `\nANEXOS DESTA MENSAGEM (as imagens vêm junto deste prompt, você as vê): ${params.attachmentNames.join(', ')}\n`
      : '';

  return `
BRIEFING ORIGINAL:
Ideia: "${params.idea}"
${goalGuidance(params.goal)}
${styleGuidance(params.style)}

STORYBOARD ATUAL (JSON, para contexto, não repita isso de volta):
${slidesToPromptJson(params.slides)}

HISTÓRICO DA CONVERSA:
${historyToPromptText(params.history)}
${attachmentsLine}
NOVA MENSAGEM DO USUÁRIO:
"""
${params.message}
"""

Responda como o assistente do CITi Slides, seguindo as regras do system prompt.
`.trim();
}
