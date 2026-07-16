/**
 * TOCADOR DE SONS DO SISTEMA.
 *
 * Efeito colateral pontual, no mesmo espírito de lib/toast.ts: uma função
 * imperativa que qualquer lugar do app chama, sem precisar de contexto React.
 * Os elementos <audio> nascem uma vez (escopo de módulo) e ficam vivos: reusar
 * em vez de recriar evita o delay de decode toda vez que o mesmo som repete.
 *
 * MASTER_VOLUME é o único multiplicador de volume do sistema, igual pros três
 * sons — o balanceamento fino já vem dos arquivos normalizados (ver
 * services/soundManifest.ts); isto aqui é só o volume geral da experiência.
 *
 * Respeita settingsStore.soundEffects (o usuário desliga em Configurações) e
 * falha em silêncio: som é reforço, nunca pode travar ou logar erro por causa
 * de autoplay bloqueado ou navegador sem suporte.
 */
import { settingsStore } from '@/stores/settingsStore';
import { SYSTEM_SOUNDS, type SystemSound } from '@/services/soundManifest';

const MASTER_VOLUME = 0.55;

const players = new Map<SystemSound, HTMLAudioElement>();

function playerFor(sound: SystemSound): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  let audio = players.get(sound);
  if (!audio) {
    audio = new Audio(SYSTEM_SOUNDS[sound].src);
    audio.preload = 'auto';
    audio.volume = MASTER_VOLUME;
    players.set(sound, audio);
  }
  return audio;
}

/** Toca um som do sistema, se o usuário não tiver desligado os efeitos sonoros. */
export function playSound(sound: SystemSound): void {
  if (!settingsStore.getState().soundEffects) return;
  const audio = playerFor(sound);
  if (!audio) return;
  audio.currentTime = 0;
  void audio.play().catch(() => {});
}
