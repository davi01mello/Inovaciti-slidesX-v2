/**
 * Estado global do guia rápido (o tour de onboarding em tela cheia). Um booleano
 * com pub/sub no mesmo padrão dos outros stores: qualquer canto do app pode abrir
 * o tour (hoje, o botão "Ver guia rápido" do card da sidebar) e o overlay montado
 * em App.tsx reage na hora. Nada é persistido — o tour é sob demanda.
 */
import { useSyncExternalStore } from 'react';

let open = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openOnboarding(): void {
  if (open) return;
  open = true;
  emit();
}

export function closeOnboarding(): void {
  if (!open) return;
  open = false;
  emit();
}

export function useOnboardingOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open);
}
