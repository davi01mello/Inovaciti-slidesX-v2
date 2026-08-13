/**
 * Assistente de chat do workspace: conversa com quem está revisando o
 * storyboard, vê os slides atuais e as imagens anexadas na mensagem.
 *
 * ALÉM de conversar, ele pode EDITAR um slide: quando o pedido é claro e mira UM
 * slide específico, a resposta vem com editSlideIndex + editInstruction, e o
 * servidor aplica a mudança de verdade via o mesmo pipeline do botão "Melhorar
 * Slide" (ver routes/chat.ts e intelligence/improve.ts). Pedido vago, sobre vários
 * slides, ou uma pergunta sem pedido de mudança: só conversa, não edita nada.
 */
import type { ChatHistoryMessage, GeneratedSlide, PresentationGoal, VisualStyle } from '../types.js';
import { currentYearLine } from './knowledge.js';
import { goalGuidance, styleGuidance } from './templates.js';
import { BASE_SYSTEM_INSTRUCTION } from './writing.js';

export const CHAT_SYSTEM_INSTRUCTION = `
${BASE_SYSTEM_INSTRUCTION}

Seu papel específico: você é o assistente de chat dentro do workspace de edição do CITi Slides, conversando com quem está revisando o storyboard. Responda SEMPRE no JSON pedido pelo schema — nunca em markdown, nunca com texto fora do JSON.

CAMPO "reply" (sempre presente):
- Texto corrido, 1 a 4 frases na maioria das respostas. Só se estenda se o usuário pedir algo que exige mais detalhe.
- Você VÊ o storyboard atual, numerado (SLIDE 1, SLIDE 2...). Cite título ou conteúdo real de um slide quando fizer sentido, em vez de falar de forma genérica.
- O usuário pode anexar imagens, às vezes citando o número de um slide. Quando receber imagens, você as VÊ: comente o que tem nelas e como o conteúdo pode entrar no texto do slide citado. Seja honesto que a arte final é gerada pelo sistema, a imagem anexada serve de referência de conteúdo.
- Tom: colega direto, sem enrolação, sem ser seco.

CAMPOS "editSlideIndex" e "editInstruction" (só quando fizer sentido editar):
- Preencha os dois JUNTOS quando o usuário pedir claramente uma mudança em UM slide específico (ele pode dizer o número, "esse slide"/"aqui" referindo ao slide atualmente aberto, ou descrever o slide de um jeito que só bate com um). editSlideIndex é o número do slide (1-based, o mesmo da lista SLIDE N). editInstruction é uma instrução objetiva e concreta do que mudar, escrita como se você estivesse briefando outro redator (ex: "Trocar o formato de tópicos por cards, com foco em resultado mensurável de cada pilar" ou "Adicionar uma métrica de ROI no lugar do segundo tópico, mantendo o resto").
- NÃO preencha esses dois campos (deixe o slide como está, só responda em "reply") quando: o pedido for vago demais pra virar uma instrução concreta; envolver vários slides de uma vez; for uma pergunta, comentário ou pedido de opinião sem intenção clara de mudar algo; ou você não tiver certeza de qual slide o usuário quer dizer -- nesse caso pergunte no "reply" em vez de arriscar editar o slide errado.
- Quando você preenche os dois campos, o "reply" ainda deve confirmar em 1 frase o que você vai mudar (ex: "Troquei os tópicos por cards com o resultado de cada pilar."), porque a edição já foi aplicada de verdade quando essa mensagem aparece — não é mais uma sugestão pra pessoa aplicar na mão.
- Slides de capa/separador/encerramento (layout cover/section/closing) não são editáveis por aqui: se o pedido for sobre um desses, explique no "reply" e não preencha os outros campos.
`.trim();

function slidesToPromptText(slides: GeneratedSlide[]): string {
  if (slides.length === 0) return '(nenhum slide ainda)';
  return slides
    .map((slide, i) => `SLIDE ${i + 1} (layout: ${slide.layout}):\n${JSON.stringify(slide.blocks, null, 2)}`)
    .join('\n\n');
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
  /** Slide aberto no editor no momento (1-based) -- resolve "esse slide"/"aqui" sem o usuário precisar dizer o número. */
  currentSlideIndex?: number;
}): string {
  const attachmentsLine =
    params.attachmentNames && params.attachmentNames.length > 0
      ? `\nANEXOS DESTA MENSAGEM (as imagens vêm junto deste prompt, você as vê): ${params.attachmentNames.join(', ')}\n`
      : '';
  const currentSlideLine =
    params.currentSlideIndex !== undefined
      ? `\nSLIDE ATUALMENTE ABERTO NO EDITOR: SLIDE ${params.currentSlideIndex}. Quando o usuário disser "esse slide", "aqui", "esse" ou não especificar qual, é a este que ele se refere, a menos que a mensagem nomeie outro.\n`
      : '';

  return `
${currentYearLine()}

BRIEFING ORIGINAL:
Ideia: "${params.idea}"
${goalGuidance(params.goal)}
${styleGuidance(params.style)}

STORYBOARD ATUAL (numerado, para contexto e referência -- não repita isso de volta):
${slidesToPromptText(params.slides)}
${currentSlideLine}
HISTÓRICO DA CONVERSA:
${historyToPromptText(params.history)}
${attachmentsLine}
NOVA MENSAGEM DO USUÁRIO:
"""
${params.message}
"""

Responda no JSON do schema, seguindo as regras do system prompt.
`.trim();
}
