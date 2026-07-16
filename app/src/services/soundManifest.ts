/**
 * OS SONS DO SISTEMA. Só existem estes três, e só nestes três momentos:
 *   presentationReady   uma apresentação termina de ser gerada
 *   assetSaved          copiar ou baixar um logo/ícone/elemento na página Marca
 *   trashEmptied        esvaziar a Lixeira
 *
 * Os três arquivos já saem normalizados pro MESMO padrão de volume (medido com
 * ffmpeg: ~-19/-20 dB de RMS e pico sempre abaixo de 0 dBFS, sem clipping) —
 * nenhum estoura, nenhum fica baixinho perto do outro. Reprocessar um som novo
 * pra este padrão:
 *
 *   ffmpeg -i original.wav -af volumedetect -f null -   # mede mean_volume
 *   ffmpeg -i original.wav -af "volume=<ajuste>dB,alimiter=limit=0.891:attack=5:release=50" saida.wav
 *
 * Quem TOCA o som é lib/sound.ts. Este arquivo só sabe onde cada som mora.
 */
import presentationReadySrc from '@/assets/sounds/presentation-ready.mp3';
import assetSavedSrc from '@/assets/sounds/asset-saved.wav';
import trashEmptiedSrc from '@/assets/sounds/trash-emptied.wav';

export type SystemSound = 'presentationReady' | 'assetSaved' | 'trashEmptied';

export const SYSTEM_SOUNDS: Record<SystemSound, { src: string; label: string }> = {
  presentationReady: { src: presentationReadySrc, label: 'Apresentação pronta' },
  assetSaved: { src: assetSavedSrc, label: 'Copiar ou baixar da Marca' },
  trashEmptied: { src: trashEmptiedSrc, label: 'Esvaziar a Lixeira' },
};
