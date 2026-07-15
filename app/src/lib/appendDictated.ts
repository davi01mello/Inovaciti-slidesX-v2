/**
 * Junta um trecho ditado por voz ao texto já escrito num campo -- o ditado ENTRA,
 * nunca substitui. Usado tanto na ideia da apresentação quanto no chat de ajuste
 * de slide (ver components/ui/MicButton.tsx).
 */
export function appendDictated(current: string, spoken: string): string {
  const trimmedSpoken = spoken.trim();
  if (trimmedSpoken.length === 0) return current;
  if (current.trim().length === 0) return trimmedSpoken;
  return /\s$/.test(current) ? `${current}${trimmedSpoken}` : `${current} ${trimmedSpoken}`;
}
