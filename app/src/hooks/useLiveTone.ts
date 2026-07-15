import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * O tom aplicado ao vivo, sem re-render do deck a cada pixel do arrasto.
 *
 * Arrastar dispara dezenas de eventos por segundo, e cada um replaneja a arte do deck
 * inteiro (38 artes x N slides). Sem isto, a barra engasga. O estado local responde na
 * hora (a barra é fluida) e o deck só é recalculado quando o quadro seguinte chega.
 */
export function useLiveTone(committed: number, commit: (tone: number) => void): [number, (tone: number) => void] {
  const [local, setLocal] = useState(committed);
  const frame = useRef(0);

  useEffect(() => setLocal(committed), [committed]);

  const set = useCallback(
    (tone: number) => {
      setLocal(tone);
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => commit(tone));
    },
    [commit],
  );

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return [local, set];
}
