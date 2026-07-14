import { useEffect, type RefObject } from 'react';
import { findOverflowing } from '@/lib/textFit';

/**
 * Auditoria de vazamento, em dev: se algum texto estourou o container, isto GRITA
 * no console em vez de deixar o slide sair bonito no print e feio na tela.
 */
export function useOverflowAudit(ref: RefObject<HTMLElement | null>, label: string): void {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const root = ref.current;
    if (!root) return;
    const id = window.setTimeout(() => {
      const bad = findOverflowing(root);
      if (bad.length > 0) {
        console.warn(
          `[fit] ${label}: ${bad.length} container(s) vazando`,
          bad.map((b) => ({ over: b.over, text: b.el.textContent?.slice(0, 40) })),
        );
      }
    }, 120);
    return () => window.clearTimeout(id);
  });
}
