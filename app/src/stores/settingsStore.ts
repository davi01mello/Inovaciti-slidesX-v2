/**
 * Preferências locais que a UI de fato aplica:
 * - reduceMotion: espelha prefers-reduced-motion via data attribute no <html> (ver index.css).
 * - defaultGoal / defaultStyle: pré-seleção do passo Direção do wizard.
 * - confirmBeforeTrash: pular ou não o diálogo de confirmação ao mandar pra Lixeira.
 * - soundEffects: liga/desliga os sons do sistema (ver lib/sound.ts).
 * Nada aqui é decorativo — cada chave tem um efeito real em algum lugar do app.
 */
import { useSyncExternalStore } from 'react';
import { loadJson, saveJson } from '@/lib/storage';
import type { PresentationGoal, VisualStyle } from '@/types/creation';

// v2: defaultSize (as antigas caixas de tamanho) virou defaultGoal. Chave nova
// pra preferência velha não voltar como valor inválido.
const STORAGE_KEY = 'citi-slides:settings:v2';

export interface AppSettings {
  reduceMotion: boolean;
  defaultGoal: PresentationGoal | null;
  defaultStyle: VisualStyle | null;
  confirmBeforeTrash: boolean;
  soundEffects: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  reduceMotion: false,
  defaultGoal: null,
  defaultStyle: null,
  confirmBeforeTrash: true,
  soundEffects: true,
};

let state: AppSettings = { ...DEFAULT_SETTINGS, ...(loadJson<Partial<AppSettings>>(STORAGE_KEY) ?? {}) };
const listeners = new Set<() => void>();

function applySideEffects(settings: AppSettings): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.reduceMotion = settings.reduceMotion ? 'true' : 'false';
  }
}

applySideEffects(state);

function emit() {
  saveJson(STORAGE_KEY, state);
  applySideEffects(state);
  listeners.forEach((l) => l());
}

export const settingsStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState(): AppSettings {
    return state;
  },
  update(patch: Partial<AppSettings>): void {
    state = { ...state, ...patch };
    emit();
  },
};

export function useSettings(): AppSettings {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.getState);
}
