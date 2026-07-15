import { useCallback, useRef, useState } from 'react';
import { transcribeAudio } from '@/services/transcribeClient';
import { pushToast } from '@/lib/toast';

export type DictationStatus = 'idle' | 'recording' | 'processing';

/** Teto de segurança: ninguém dita 2 minutos seguidos, e evita gravação presa. */
const MAX_RECORDING_MS = 120_000;

/** Abaixo disso é clique acidental, não fala de verdade. */
const MIN_BLOB_BYTES = 800;

const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Não consegui ler o áudio gravado.'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Não consegui ler o áudio gravado.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Ditado por voz: grava no microfone do navegador, manda pro backend transcrever
 * (OpenAI Whisper) e devolve o texto pronto via `onTranscribed`. Quem usa só
 * chama `start`/`stop` -- toda a mecânica de MediaRecorder, permissão e upload
 * fica aqui dentro.
 *
 * Clique-clique, não pressionar-e-segurar: em trackpad, segurar o botão do
 * mouse enquanto fala é desconfortável. Clica pra começar, clica de novo (ou
 * espera o teto de MAX_RECORDING_MS) pra parar e transcrever.
 */
export function useDictation(onTranscribed: (text: string) => void): {
  status: DictationStatus;
  start: () => void;
  stop: () => void;
  cancel: () => void;
} {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus('processing');

    recorder.onstop = () => {
      void (async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        releaseStream();
        recorderRef.current = null;
        chunksRef.current = [];

        if (blob.size < MIN_BLOB_BYTES) {
          pushToast('Gravação muito curta -- clica no microfone e fala um pouco mais.');
          setStatus('idle');
          return;
        }

        try {
          const base64 = await blobToBase64(blob);
          const text = await transcribeAudio(base64, blob.type || 'audio/webm');
          onTranscribed(text);
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'Não consegui transcrever o áudio agora.');
        } finally {
          setStatus('idle');
        }
      })();
    };
    recorder.stop();
  }, [onTranscribed, releaseStream]);

  const start = useCallback(() => {
    if (status !== 'idle') return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      pushToast('Esse navegador não suporta gravação de áudio.');
      return;
    }

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mimeType = pickMimeType();
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorderRef.current = recorder;
        recorder.start();
        setStatus('recording');
        timeoutRef.current = window.setTimeout(() => stop(), MAX_RECORDING_MS);
      } catch {
        pushToast('Não consegui acessar o microfone. Verifica a permissão do navegador pro CITi Slides.');
      }
    })();
  }, [status, stop]);

  /** Descarta a gravação em andamento sem transcrever (ex: o usuário sai do campo no meio). */
  const cancel = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    releaseStream();
    recorderRef.current = null;
    chunksRef.current = [];
    setStatus('idle');
  }, [releaseStream]);

  return { status, start, stop, cancel };
}
