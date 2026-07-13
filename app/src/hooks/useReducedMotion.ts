/**
 * Verdade única sobre "reduzir movimento": junta a preferência do sistema
 * (prefers-reduced-motion) com o toggle de Configurações — as duas valem, qualquer
 * uma sozinha já basta pra desligar.
 *
 * O index.css já corta animação e transição CSS nos dois casos. Este hook existe
 * pro que só o JS consegue desligar: shader WebGL, coreografia longa, partícula.
 */
import { useReducedMotion as useSystemReducedMotion } from 'motion/react';
import { useSettings } from '@/stores/settingsStore';

export function useReducedMotion(): boolean {
  const system = useSystemReducedMotion();
  const { reduceMotion } = useSettings();
  return reduceMotion || system === true;
}
