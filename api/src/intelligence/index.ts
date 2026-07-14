/**
 * Central única de instruções de IA do CITi Slides.
 * Toda rota importa daqui; nenhum prompt vive fora deste diretório.
 */
export { BASE_SYSTEM_INSTRUCTION, WRITING_PRINCIPLES } from './writing.js';
export {
  GOALS,
  STYLES,
  audienceLine,
  goalGuidance,
  slideCountGuidance,
  styleGuidance,
} from './templates.js';
export {
  STRATEGIST_SYSTEM_INSTRUCTION,
  buildStrategistPrompt,
  sanitizeStrategistPlan,
  type StrategistBriefing,
} from './strategist.js';
export { GENERATOR_SYSTEM_INSTRUCTION, buildGeneratorPrompt } from './generator.js';
export { CHAT_SYSTEM_INSTRUCTION, buildChatPrompt } from './chat.js';
export { IMPROVE_SYSTEM_INSTRUCTION, buildImprovePrompt } from './improve.js';
