/**
 * Perfil local do usuário (nome, área, e-mail), persistido no navegador.
 * Não existe backend de contas — isso é o que assina a UI (sidebar, hero, menu)
 * e a página /perfil edita.
 */
import { useSyncExternalStore } from 'react';
import { loadJson, saveJson } from '@/lib/storage';

const STORAGE_KEY = 'citi-slides:user:v1';

export interface UserProfile {
  name: string;
  department: string;
  email: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Equipe CITi',
  department: 'CITi Empresa Júnior',
  email: '',
};

function sanitize(profile: UserProfile): UserProfile {
  return {
    name: profile.name.trim() || DEFAULT_PROFILE.name,
    department: profile.department.trim(),
    email: profile.email.trim(),
  };
}

let state: UserProfile = { ...DEFAULT_PROFILE, ...(loadJson<Partial<UserProfile>>(STORAGE_KEY) ?? {}) };
const listeners = new Set<() => void>();

function emit() {
  saveJson(STORAGE_KEY, state);
  listeners.forEach((l) => l());
}

export const userStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState(): UserProfile {
    return state;
  },
  update(patch: Partial<UserProfile>): void {
    state = sanitize({ ...state, ...patch });
    emit();
  },
};

export function useUserProfile(): UserProfile {
  return useSyncExternalStore(userStore.subscribe, userStore.getState);
}

/** true se já existe um perfil salvo neste navegador (independente de conteúdo). */
export function hasSavedProfile(): boolean {
  return loadJson<Partial<UserProfile>>(STORAGE_KEY) !== null;
}

/** Iniciais pra avatar: primeira letra do primeiro e do último nome. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}
